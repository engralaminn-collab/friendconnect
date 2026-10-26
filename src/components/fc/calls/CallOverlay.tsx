'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { useSocket } from '@/hooks/use-socket'
import { RT, iceServers } from '@/lib/constants'
import { api } from '@/lib/api'
import { UserAvatar } from '@/components/fc/ui'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Phone,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type CallType = 'audio' | 'video'
type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected'
type Role = 'caller' | 'callee'

interface PeerInfo {
  id: string
  name: string
  photoUrl: string | null
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const NO_ANSWER_MS = 30_000

export function CallOverlay() {
  const { socket } = useSocket()

  // ---------- UI state ----------
  const [status, setStatus] = useState<CallStatus>('idle')
  const [type, setType] = useState<CallType>('audio')
  const [peer, setPeer] = useState<PeerInfo | null>(null)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [connState, setConnState] = useState<string>('new')
  const [elapsed, setElapsed] = useState(0)

  // ---------- Refs for WebRTC + mutable state ----------
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  const callIdRef = useRef<string | null>(null)
  const peerRef = useRef<PeerInfo | null>(null)
  const roleRef = useRef<Role | null>(null)
  const typeRef = useRef<CallType>('audio')
  const targetUserIdRef = useRef<string | null>(null)
  const statusRef = useRef<CallStatus>('idle')
  const socketRef = useRef<Socket | null>(null)

  const pendingOfferRef = useRef<string | null>(null)
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([])
  const remoteDescSetRef = useRef(false)
  const callStartTsRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noAnswerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restartAttemptedRef = useRef(false)
  const endingRef = useRef(false)

  // Mirror UI states in refs for use inside socket callbacks & timeouts
  const micEnabledRef = useRef(true)
  const videoEnabledRef = useRef(true)
  const speakerOnRef = useRef(true)
  const facingModeRef = useRef<'user' | 'environment'>('user')

  // ---------- Keep socketRef in sync ----------
  useEffect(() => {
    socketRef.current = socket
  }, [socket])

  // ---------- Stable utility callbacks ----------
  const updateStatus = useCallback((s: CallStatus) => {
    statusRef.current = s
    setStatus(s)
  }, [])

  const startTimer = useCallback(() => {
    if (timerRef.current) return
    callStartTsRef.current = Date.now()
    setElapsed(0)
    timerRef.current = setInterval(() => {
      if (callStartTsRef.current) {
        setElapsed(Math.floor((Date.now() - callStartTsRef.current) / 1000))
      }
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    callStartTsRef.current = null
  }, [])

  const computeDuration = useCallback(() => {
    if (!callStartTsRef.current) return 0
    return Math.floor((Date.now() - callStartTsRef.current) / 1000)
  }, [])

  const flushIceQueue = useCallback(async () => {
    const pc = pcRef.current
    if (!pc || !remoteDescSetRef.current) return
    const queue = iceCandidateQueueRef.current
    if (queue.length === 0) return
    iceCandidateQueueRef.current = []
    for (const c of queue) {
      try {
        await pc.addIceCandidate(c)
      } catch {
        // ignore
      }
    }
  }, [])

  const attachMediaElements = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
      }
    }
  }, [])

  // ---------- Cleanup ----------
  const cleanupAll = useCallback(() => {
    // stop local media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop()
        } catch {}
      })
      localStreamRef.current = null
    }
    // close PC
    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null
        pcRef.current.onicecandidate = null
        pcRef.current.onconnectionstatechange = null
        pcRef.current.oniceconnectionstatechange = null
        pcRef.current.close()
      } catch {}
      pcRef.current = null
    }
    // clear remote stream
    remoteStreamRef.current = null
    // clear timeouts
    if (noAnswerTimeoutRef.current) {
      clearTimeout(noAnswerTimeoutRef.current)
      noAnswerTimeoutRef.current = null
    }
    stopTimer()
    // reset refs
    callIdRef.current = null
    peerRef.current = null
    roleRef.current = null
    targetUserIdRef.current = null
    pendingOfferRef.current = null
    iceCandidateQueueRef.current = []
    remoteDescSetRef.current = false
    restartAttemptedRef.current = false
    endingRef.current = false
    micEnabledRef.current = true
    videoEnabledRef.current = true
    speakerOnRef.current = true
    facingModeRef.current = 'user'

    // reset UI state
    setPeer(null)
    setType('audio')
    setMicEnabled(true)
    setVideoEnabled(true)
    setSpeakerOn(true)
    setFacingMode('user')
    setConnState('new')
    setElapsed(0)
    updateStatus('idle')
  }, [stopTimer, updateStatus])

  // ---------- End call (user-initiated) ----------
  const endCall = useCallback(() => {
    if (endingRef.current) return
    if (statusRef.current === 'idle') return
    endingRef.current = true

    const targetId = targetUserIdRef.current
    const callId = callIdRef.current
    const duration = computeDuration()

    // Stop local tracks (so peer gets track-ended event)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop()
        } catch {}
      })
      localStreamRef.current = null
    }
    // Close PC
    if (pcRef.current) {
      try {
        pcRef.current.close()
      } catch {}
      pcRef.current = null
    }
    // Signal peer
    if (socketRef.current && targetId) {
      socketRef.current.emit(RT.CALL_END, { targetUserId: targetId })
    }
    // Record end if we have a call record (we created it)
    if (callId) {
      api('/api/calls', {
        method: 'POST',
        body: JSON.stringify({
          action: 'end',
          callId,
          status: 'ended',
          duration,
        }),
      }).catch(() => {})
    }
    cleanupAll()
  }, [cleanupAll, computeDuration])

  // ---------- RTCPeerConnection handlers ----------
  const setupPcHandlers = useCallback(
    (pc: RTCPeerConnection, targetUserId: string) => {
      pc.ontrack = (event) => {
        let remoteStream = remoteStreamRef.current
        if (!remoteStream) {
          remoteStream = new MediaStream()
          remoteStreamRef.current = remoteStream
        }
        if (
          !remoteStream.getTracks().find((x) => x.id === event.track.id)
        ) {
          remoteStream.addTrack(event.track)
        }
        attachMediaElements()
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit(RT.CALL_ICE, {
            targetUserId,
            candidate: event.candidate.toJSON(),
          })
        }
      }

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        setConnState(state)
        if (state === 'connected') {
          if (statusRef.current !== 'connected') {
            updateStatus('connected')
            startTimer()
          }
        } else if (state === 'failed') {
          if (!restartAttemptedRef.current) {
            restartAttemptedRef.current = true
            try {
              pc.restartIce()
            } catch {}
            // Try renegotiation if we are the caller
            if (roleRef.current === 'caller') {
              ;(async () => {
                try {
                  const offer = await pc.createOffer({
                    iceRestart: true,
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: typeRef.current === 'video',
                  })
                  await pc.setLocalDescription(offer)
                  if (socketRef.current && targetUserIdRef.current) {
                    socketRef.current.emit(RT.CALL_OFFER, {
                      targetUserId: targetUserIdRef.current,
                      type: typeRef.current,
                      sdp: offer.sdp,
                    })
                  }
                } catch {
                  // ignore
                }
              })()
            }
            toast('Connection issue — restarting…')
          } else {
            toast.error('Call connection failed')
            endCall()
          }
        }
      }

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState
        if (state === 'disconnected') {
          setConnState('disconnected')
        }
      }
    },
    [attachMediaElements, endCall, startTimer, updateStatus]
  )

  // ---------- Outgoing call ----------
  const startOutgoingCall = useCallback(
    async (targetUserId: string, callType: CallType) => {
      if (statusRef.current !== 'idle') {
        toast.error('Already in a call')
        return
      }
      if (!socketRef.current) {
        toast.error('Not connected — try again')
        return
      }

      // 1. POST /api/calls (start)
      let callId: string | null = null
      try {
        const res = await api<{ call: { id: string } }>('/api/calls', {
          method: 'POST',
          body: JSON.stringify({
            action: 'start',
            receiverId: targetUserId,
            type: callType,
          }),
        })
        callId = res.call.id
        callIdRef.current = callId
      } catch (e: any) {
        toast.error(e.message || 'Could not start call')
        return
      }

      // 2. Set state
      typeRef.current = callType
      setType(callType)
      targetUserIdRef.current = targetUserId
      roleRef.current = 'caller'
      videoEnabledRef.current = callType === 'video'
      setVideoEnabled(callType === 'video')
      micEnabledRef.current = true
      setMicEnabled(true)
      speakerOnRef.current = true
      setSpeakerOn(true)
      facingModeRef.current = 'user'
      setFacingMode('user')
      setConnState('new')
      setElapsed(0)
      restartAttemptedRef.current = false

      // 3. Fetch peer info
      try {
        const data = await api<{
          user: { id: string; name: string; photoUrl: string | null }
        }>(`/api/users/${targetUserId}`)
        const peerInfo: PeerInfo = {
          id: targetUserId,
          name: data.user.name,
          photoUrl: data.user.photoUrl,
        }
        peerRef.current = peerInfo
        setPeer(peerInfo)
      } catch {
        const peerInfo: PeerInfo = {
          id: targetUserId,
          name: 'User',
          photoUrl: null,
        }
        peerRef.current = peerInfo
        setPeer(peerInfo)
      }

      // 4. getUserMedia
      let localStream: MediaStream
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video:
            callType === 'video' ? { facingMode: 'user' } : false,
        })
      } catch (e: any) {
        toast.error('Microphone/Camera permission denied')
        if (callId) {
          api('/api/calls', {
            method: 'POST',
            body: JSON.stringify({
              action: 'end',
              callId,
              status: 'failed',
            }),
          }).catch(() => {})
        }
        cleanupAll()
        return
      }
      localStreamRef.current = localStream

      // 5. Create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers: iceServers() })
      pcRef.current = pc
      setupPcHandlers(pc, targetUserId)

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
      })

      // Create empty remote stream
      const remoteStream = new MediaStream()
      remoteStreamRef.current = remoteStream

      // 6. Create offer, setLocalDescription, emit
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video',
        })
        await pc.setLocalDescription(offer)
        socketRef.current.emit(RT.CALL_OFFER, {
          targetUserId,
          type: callType,
          sdp: offer.sdp,
        })
      } catch (e: any) {
        toast.error('Failed to create call')
        cleanupAll()
        return
      }

      // 7. Show "Calling…" UI
      updateStatus('outgoing')

      // 8. No-answer timeout (30s) — auto-end as "no answer"
      noAnswerTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'outgoing') {
          toast.error('No answer')
          if (callIdRef.current) {
            api('/api/calls', {
              method: 'POST',
              body: JSON.stringify({
                action: 'end',
                callId: callIdRef.current,
                status: 'missed',
              }),
            }).catch(() => {})
          }
          if (socketRef.current && targetUserIdRef.current) {
            socketRef.current.emit(RT.CALL_END, {
              targetUserId: targetUserIdRef.current,
            })
          }
          cleanupAll()
        }
      }, NO_ANSWER_MS)
    },
    [cleanupAll, setupPcHandlers, updateStatus]
  )

  // ---------- Accept incoming ----------
  const acceptCall = useCallback(async () => {
    if (statusRef.current !== 'incoming' || !pendingOfferRef.current) return
    const offerSdp = pendingOfferRef.current
    const callerId = targetUserIdRef.current
    const callType = typeRef.current
    if (!callerId || !socketRef.current) return

    // getUserMedia
    let localStream: MediaStream
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          callType === 'video' ? { facingMode: 'user' } : false,
      })
    } catch (e: any) {
      toast.error('Microphone/Camera permission denied')
      socketRef.current.emit(RT.CALL_REJECT, { targetUserId: callerId })
      cleanupAll()
      return
    }
    localStreamRef.current = localStream

    const pc = new RTCPeerConnection({ iceServers: iceServers() })
    pcRef.current = pc
    setupPcHandlers(pc, callerId)

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream)
    })

    const remoteStream = new MediaStream()
    remoteStreamRef.current = remoteStream

    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp })
      remoteDescSetRef.current = true
      flushIceQueue()

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socketRef.current.emit(RT.CALL_ANSWER, {
        targetUserId: callerId,
        sdp: answer.sdp,
      })

      updateStatus('connecting')
    } catch (e: any) {
      toast.error('Failed to accept call')
      socketRef.current.emit(RT.CALL_REJECT, { targetUserId: callerId })
      cleanupAll()
    }
  }, [cleanupAll, flushIceQueue, setupPcHandlers, updateStatus])

  // ---------- Decline incoming ----------
  const declineCall = useCallback(() => {
    if (statusRef.current !== 'incoming') return
    const callerId = targetUserIdRef.current
    if (socketRef.current && callerId) {
      socketRef.current.emit(RT.CALL_REJECT, { targetUserId: callerId })
    }
    cleanupAll()
  }, [cleanupAll])

  // ---------- Control toggles ----------
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) return
    const newEnabled = !micEnabledRef.current
    micEnabledRef.current = newEnabled
    setMicEnabled(newEnabled)
    audioTracks.forEach((t) => {
      t.enabled = newEnabled
    })
  }, [])

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const videoTracks = stream.getVideoTracks()
    if (videoTracks.length === 0) return
    const newEnabled = !videoEnabledRef.current
    videoEnabledRef.current = newEnabled
    setVideoEnabled(newEnabled)
    videoTracks.forEach((t) => {
      t.enabled = newEnabled
    })
  }, [])

  const toggleSpeaker = useCallback(() => {
    const newOn = !speakerOnRef.current
    speakerOnRef.current = newOn
    setSpeakerOn(newOn)
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !newOn
    }
  }, [])

  const switchCamera = useCallback(async () => {
    const stream = localStreamRef.current
    if (!stream) return
    const videoTracks = stream.getVideoTracks()
    if (videoTracks.length === 0) {
      toast.error('No camera available')
      return
    }
    const track = videoTracks[0]
    const newFacing = facingModeRef.current === 'user' ? 'environment' : 'user'

    // Try applyConstraints first (works on some browsers)
    let switched = false
    try {
      await track.applyConstraints({
        advanced: [{ facingMode: newFacing }],
      })
      // If the track actually has a different facingMode now, accept it
      const caps = track.getCapabilities?.() as
        | MediaTrackCapabilities
        | undefined
      if (
        caps &&
        Array.isArray(caps.facingMode) &&
        caps.facingMode.includes(newFacing)
      ) {
        facingModeRef.current = newFacing
        setFacingMode(newFacing)
        switched = true
      }
    } catch {
      // ignore — fall through to replaceTrack approach
    }

    if (switched) return

    // Fallback: get a brand new video track with the desired facingMode and replace it
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: newFacing },
      })
      const newTrack = newStream.getVideoTracks()[0]
      if (!newTrack) throw new Error('No video track')
      const sender = pcRef.current
        ?.getSenders()
        .find((s) => s.track?.kind === 'video')
      if (sender) {
        await sender.replaceTrack(newTrack)
      }
      try {
        track.stop()
      } catch {}
      stream.removeTrack(track)
      stream.addTrack(newTrack)
      facingModeRef.current = newFacing
      setFacingMode(newFacing)
      // Re-attach so the local PiP updates immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (e: any) {
      toast.error('Could not switch camera')
    }
  }, [])

  // ---------- Listen for fc:start-call events ----------
  useEffect(() => {
    const handleStartCall = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        targetUserId: string
        type: CallType
      }
      if (!detail || !detail.targetUserId) return
      void startOutgoingCall(
        detail.targetUserId,
        detail.type === 'video' ? 'video' : 'audio'
      )
    }
    window.addEventListener('fc:start-call', handleStartCall)
    return () =>
      window.removeEventListener('fc:start-call', handleStartCall)
  }, [startOutgoingCall])

  // ---------- Socket listeners for incoming/answer/ICE/end ----------
  useEffect(() => {
    if (!socket) return

    const handleIncoming = async (data: any) => {
      if (!data) return
      const { callerId, type, sdp, ringing, from } = data
      const peerId = callerId || from
      if (!peerId) return
      if (statusRef.current !== 'idle') return

      if (sdp) {
        // Offer arrived — incoming call
        typeRef.current = type === 'video' ? 'video' : 'audio'
        setType(typeRef.current)
        targetUserIdRef.current = peerId
        roleRef.current = 'callee'
        pendingOfferRef.current = sdp
        restartAttemptedRef.current = false
        micEnabledRef.current = true
        setMicEnabled(true)
        videoEnabledRef.current = typeRef.current === 'video'
        setVideoEnabled(typeRef.current === 'video')
        speakerOnRef.current = true
        setSpeakerOn(true)
        facingModeRef.current = 'user'
        setFacingMode('user')
        setConnState('new')
        setElapsed(0)

        try {
          const res = await api<{
            user: { id: string; name: string; photoUrl: string | null }
          }>(`/api/users/${peerId}`)
          const peerInfo: PeerInfo = {
            id: peerId,
            name: res.user.name,
            photoUrl: res.user.photoUrl,
          }
          peerRef.current = peerInfo
          setPeer(peerInfo)
        } catch {
          const peerInfo: PeerInfo = {
            id: peerId,
            name: 'Caller',
            photoUrl: null,
          }
          peerRef.current = peerInfo
          setPeer(peerInfo)
        }

        updateStatus('incoming')
      } else if (ringing) {
        // Ringing ping — caller side; ignore (UI already shows "Calling…")
      }
    }

    const handleSdp = async (data: any) => {
      if (!data) return
      const { kind, sdp, from } = data
      if (kind !== 'answer' || !sdp) return
      const targetId = targetUserIdRef.current
      if (from && targetId && from !== targetId) return
      const pc = pcRef.current
      if (!pc) return
      try {
        await pc.setRemoteDescription({ type: 'answer', sdp })
        remoteDescSetRef.current = true
        flushIceQueue()
        if (noAnswerTimeoutRef.current) {
          clearTimeout(noAnswerTimeoutRef.current)
          noAnswerTimeoutRef.current = null
        }
        if (statusRef.current === 'outgoing') {
          updateStatus('connecting')
        }
      } catch {
        // ignore
      }
    }

    const handleIce = async (data: any) => {
      if (!data || !data.candidate) return
      const { from } = data
      const targetId = targetUserIdRef.current
      if (from && targetId && from !== targetId) return
      const pc = pcRef.current
      if (!pc) return
      if (!remoteDescSetRef.current || !pc.remoteDescription) {
        iceCandidateQueueRef.current.push(data.candidate)
        return
      }
      try {
        await pc.addIceCandidate(data.candidate)
      } catch {
        // ignore
      }
    }

    const handleEnded = (data: any) => {
      if (!data) return
      const { reason, by, from } = data
      if (statusRef.current === 'idle') return
      const targetId = targetUserIdRef.current
      if (from && targetId && from !== targetId) return

      // Record end if we initiated the call (we own the callId)
      const callId = callIdRef.current
      if (roleRef.current === 'caller' && callId) {
        api('/api/calls', {
          method: 'POST',
          body: JSON.stringify({
            action: 'end',
            callId,
            status: reason === 'declined' ? 'declined' : 'ended',
            duration: computeDuration(),
          }),
        }).catch(() => {})
      }

      if (reason === 'declined') {
        toast('Call declined')
      } else {
        toast('Call ended')
      }

      cleanupAll()
    }

    socket.on(RT.CALL_INCOMING, handleIncoming)
    socket.on(RT.CALL_SDP, handleSdp)
    socket.on(RT.CALL_ICE_CANDIDATE, handleIce)
    socket.on(RT.CALL_ENDED, handleEnded)

    return () => {
      socket.off(RT.CALL_INCOMING, handleIncoming)
      socket.off(RT.CALL_SDP, handleSdp)
      socket.off(RT.CALL_ICE_CANDIDATE, handleIce)
      socket.off(RT.CALL_ENDED, handleEnded)
    }
  }, [
    socket,
    cleanupAll,
    computeDuration,
    flushIceQueue,
    updateStatus,
  ])

  // ---------- Cleanup on unmount ----------
  useEffect(() => {
    return () => {
      const targetId = targetUserIdRef.current
      const callId = callIdRef.current
      if (socketRef.current && targetId && statusRef.current !== 'idle') {
        try {
          socketRef.current.emit(RT.CALL_END, { targetUserId: targetId })
        } catch {}
      }
      if (callId && statusRef.current !== 'idle') {
        try {
          const payload = JSON.stringify({
            action: 'end',
            callId,
            status: 'ended',
            duration: 0,
          })
          navigator.sendBeacon(
            '/api/calls',
            new Blob([payload], { type: 'application/json' })
          )
        } catch {}
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          try {
            t.stop()
          } catch {}
        })
      }
      if (pcRef.current) {
        try {
          pcRef.current.close()
        } catch {}
      }
      if (noAnswerTimeoutRef.current) clearTimeout(noAnswerTimeoutRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ---------- beforeunload handler ----------
  useEffect(() => {
    const handler = () => {
      if (statusRef.current === 'idle') return
      const targetId = targetUserIdRef.current
      const callId = callIdRef.current
      if (socketRef.current && targetId) {
        try {
          socketRef.current.emit(RT.CALL_END, { targetUserId: targetId })
        } catch {}
      }
      if (callId) {
        try {
          const payload = JSON.stringify({
            action: 'end',
            callId,
            status: 'ended',
            duration: 0,
          })
          navigator.sendBeacon(
            '/api/calls',
            new Blob([payload], { type: 'application/json' })
          )
        } catch {}
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          try {
            t.stop()
          } catch {}
        })
      }
      if (pcRef.current) {
        try {
          pcRef.current.close()
        } catch {}
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ---------- Network change handler ----------
  useEffect(() => {
    const conn = (navigator as any).connection
    if (!conn || !conn.addEventListener) return
    const handler = () => {
      if (statusRef.current === 'connected' || statusRef.current === 'connecting') {
        toast('Network changed — reconnecting…')
      }
    }
    conn.addEventListener('change', handler)
    return () => {
      try {
        conn.removeEventListener('change', handler)
      } catch {}
    }
  }, [])

  // ---------- Re-attach media elements on relevant state changes ----------
  useEffect(() => {
    attachMediaElements()
  }, [status, type, videoEnabled, peer, elapsed, attachMediaElements])

  // ---------- Apply speaker on/off to remote audio element ----------
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !speakerOn
    }
  }, [speakerOn, status])

  // ---------- Cleanup if socket disconnects mid-call ----------
  useEffect(() => {
    if (!socket && statusRef.current !== 'idle') {
      cleanupAll()
    }
  }, [socket, cleanupAll])

  // ---------- Render ----------
  // Show overlay as soon as call starts (status !== 'idle'), even before peer info loads.
  // If peer is null, show a loading state instead of returning null.
  if (status === 'idle') return null

  const isVideo = type === 'video'
  const isRinging =
    status === 'outgoing' || status === 'incoming' || status === 'connecting'
  const isConnected = status === 'connected'
  const showRemoteVideo = isVideo && (isConnected || status === 'connecting')
  const showLocalPiP = isVideo && videoEnabled && status !== 'incoming'

  const statusLabel = (() => {
    if (status === 'outgoing') return 'Calling…'
    if (status === 'incoming') return 'Incoming call'
    if (status === 'connecting') return 'Connecting…'
    if (status === 'connected') {
      if (connState === 'disconnected') return 'Reconnecting…'
      return formatDuration(elapsed)
    }
    return ''
  })()

  const peerName = peer?.name || 'User'
  const peerPhoto = peer?.photoUrl ?? null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Call with ${peerName}`}
    >
      {/* Background: subtle primary glow (hidden when remote video fills the screen) */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/30 via-black to-black transition-opacity duration-500',
          showRemoteVideo ? 'opacity-0' : 'opacity-100'
        )}
      />

      {/* Remote video (full-screen for video calls once connected) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={cn(
          'absolute inset-0 h-full w-full bg-black object-cover transition-opacity duration-500',
          showRemoteVideo ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Local video PiP */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'absolute right-4 top-20 z-10 h-40 w-28 rounded-2xl border-2 border-white/30 bg-black object-cover shadow-2xl transition-opacity duration-300',
          showLocalPiP ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Top bar: status + camera badge */}
      <div className="fc-safe-top relative z-10 flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 backdrop-blur">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              isConnected
                ? connState === 'disconnected'
                  ? 'bg-amber-400 fc-pulse'
                  : 'bg-emerald-400'
                : 'bg-amber-400 fc-pulse'
            )}
          />
          <span className="text-xs font-medium text-white/90">{statusLabel}</span>
        </div>
        {isVideo && (
          <div className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-wide text-white/70 backdrop-blur">
            {facingMode === 'user' ? 'Front' : 'Back'}
          </div>
        )}
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        {/* Avatar + ringing rings */}
        {(isRinging || (!isVideo && !isConnected)) || (!isVideo && isConnected) ? (
          <div className="relative grid place-items-center">
            {isRinging && (
              <>
                <span className="fc-ping-ring absolute h-40 w-40 rounded-full bg-primary/40" />
                <span
                  className="fc-ping-ring absolute h-40 w-40 rounded-full bg-primary/30"
                  style={{ animationDelay: '0.5s' }}
                />
                <span
                  className="fc-ping-ring absolute h-40 w-40 rounded-full bg-primary/20"
                  style={{ animationDelay: '1s' }}
                />
              </>
            )}
            <div className="relative">
              <UserAvatar
                name={peerName}
                src={peerPhoto}
                size={128}
                className="ring-4 ring-white/20"
              />
              {isRinging && (
                <div className="fc-ring-anim absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  {isVideo ? <Video size={18} /> : <Phone size={18} />}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Audio waves when connected (audio only) */}
        {isConnected && !isVideo && (
          <div className="flex items-end gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <span
                key={i}
                className="fc-pulse inline-block w-1.5 rounded-full bg-primary"
                style={{
                  height: 12 + ((i * 7) % 22),
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.9s',
                }}
              />
            ))}
          </div>
        )}

        <div className="space-y-1">
          <div className="text-2xl font-bold drop-shadow-md">{peerName}</div>
          <div className="text-sm text-white/70">
            {status === 'outgoing' && (isVideo ? 'Video calling…' : 'Calling…')}
            {status === 'incoming' &&
              (isVideo ? 'Incoming video call' : 'Incoming audio call')}
            {status === 'connecting' && 'Connecting…'}
            {status === 'connected' && formatDuration(elapsed)}
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="fc-safe-bottom relative z-10 flex flex-col items-center gap-4 px-6 pb-8 pt-6">
        {status === 'incoming' ? (
          <div className="flex items-center gap-12">
            <button
              onClick={declineCall}
              className="grid h-16 w-16 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 active:scale-95"
              aria-label="Decline call"
            >
              <PhoneOff size={28} />
            </button>
            <button
              onClick={acceptCall}
              className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 active:scale-95"
              aria-label="Accept call"
            >
              {isVideo ? <Video size={28} /> : <Phone size={28} />}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={toggleMic}
              className={cn(
                'grid h-14 w-14 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25 active:scale-95',
                !micEnabled && 'bg-red-600/90 hover:bg-red-500'
              )}
              aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
            </button>
            {isVideo && (
              <button
                onClick={toggleVideo}
                className={cn(
                  'grid h-14 w-14 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25 active:scale-95',
                  !videoEnabled && 'bg-red-600/90 hover:bg-red-500'
                )}
                aria-label={
                  videoEnabled ? 'Disable video' : 'Enable video'
                }
              >
                {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
              </button>
            )}
            {isVideo && (
              <button
                onClick={switchCamera}
                className="grid h-14 w-14 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25 active:scale-95"
                aria-label="Switch camera"
              >
                <FlipHorizontal size={22} />
              </button>
            )}
            <button
              onClick={toggleSpeaker}
              className={cn(
                'grid h-14 w-14 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25 active:scale-95',
                !speakerOn && 'bg-white/5'
              )}
              aria-label={speakerOn ? 'Mute speaker' : 'Unmute speaker'}
            >
              {speakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
            <button
              onClick={endCall}
              className="grid h-14 w-14 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 active:scale-95"
              aria-label="End call"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
