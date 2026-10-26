CREATE TABLE `auth_identities` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`provider_account_id` varchar(255) NOT NULL,
	`provider_data` json,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `auth_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_identities_provider_uq` UNIQUE(`provider`,`provider_account_id`)
);
--> statement-breakpoint
CREATE TABLE `device_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`platform` varchar(20),
	`browser` varchar(40),
	`os` varchar(60),
	`device_name` varchar(120),
	`push_token` varchar(255),
	`last_seen_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `device_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` varchar(36) NOT NULL,
	`bio` text,
	`avatar_media_id` varchar(36),
	`phone` varchar(32),
	`city` varchar(120),
	`country` varchar(120),
	`locale` varchar(10) DEFAULT 'en',
	`timezone` varchar(64),
	`headline` varchar(200),
	`website` varchar(500),
	`metadata` json,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`device_id` varchar(36),
	`user_agent` varchar(300),
	`ip` varchar(45),
	`last_seen_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` varchar(36) NOT NULL,
	`preferences` json NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `user_preferences_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(254) NOT NULL,
	`handle` varchar(32),
	`display_name` varchar(120) NOT NULL,
	`password_hash` varchar(255),
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`email_verified_at` datetime(3),
	`failed_login_count` int NOT NULL DEFAULT 0,
	`locked_until` datetime(3),
	`last_login_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`deleted_at` datetime(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`),
	CONSTRAINT `users_handle_uq` UNIQUE(`handle`)
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`purpose` varchar(32) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `verification_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `verification_tokens_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `contact_requests` (
	`id` varchar(36) NOT NULL,
	`from_user_id` varchar(36) NOT NULL,
	`to_user_id` varchar(36) NOT NULL,
	`message` varchar(500),
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`responded_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `contact_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`contact_user_id` varchar(36),
	`display_name` varchar(120) NOT NULL,
	`email` varchar(254),
	`phone` varchar(32),
	`tags` json NOT NULL,
	`starred` boolean NOT NULL DEFAULT false,
	`note` text,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `contacts_owner_user_uq` UNIQUE(`owner_id`,`contact_user_id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_members` (
	`conversation_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` varchar(12) NOT NULL DEFAULT 'member',
	`joined_at` datetime(3) NOT NULL,
	`added_by` varchar(36),
	`last_read_at` datetime(3),
	`archived_at` datetime(3),
	`muted_until` datetime(3),
	`pinned_at` datetime(3),
	CONSTRAINT `conversation_members_conversation_id_user_id_pk` PRIMARY KEY(`conversation_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` varchar(36) NOT NULL,
	`type` varchar(8) NOT NULL DEFAULT 'direct',
	`title` varchar(120),
	`created_by` varchar(36) NOT NULL,
	`last_message_id` varchar(36),
	`last_message_at` datetime(3),
	`disappearing_sec` int NOT NULL DEFAULT 0,
	`wallpaper` varchar(64),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `read_cursors` (
	`conversation_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`last_message_id` varchar(36) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `read_cursors_conversation_id_user_id_pk` PRIMARY KEY(`conversation_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`driver` varchar(8) NOT NULL,
	`bucket` varchar(120),
	`object_key` varchar(500) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`mime` varchar(150) NOT NULL,
	`kind` varchar(12) NOT NULL,
	`size_bytes` bigint unsigned NOT NULL,
	`sha256` varchar(64),
	`width` int,
	`height` int,
	`duration_sec` int,
	`status` varchar(12) NOT NULL DEFAULT 'pending',
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_attachments` (
	`id` varchar(36) NOT NULL,
	`message_id` varchar(36) NOT NULL,
	`media_id` varchar(36) NOT NULL,
	`caption` text,
	`position` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `message_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_reactions` (
	`message_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`emoji` varchar(32) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `message_reactions_message_id_user_id_emoji_pk` PRIMARY KEY(`message_id`,`user_id`,`emoji`)
);
--> statement-breakpoint
CREATE TABLE `message_receipts` (
	`id` varchar(36) NOT NULL,
	`message_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`state` varchar(12) NOT NULL,
	`delivered_at` datetime(3),
	`read_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `message_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_receipts_message_user_uq` UNIQUE(`message_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `message_reports` (
	`id` varchar(36) NOT NULL,
	`reporter_id` varchar(36) NOT NULL,
	`message_id` varchar(36) NOT NULL,
	`reason` varchar(120) NOT NULL,
	`detail` text,
	`status` varchar(16) NOT NULL DEFAULT 'received',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `message_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`sender_id` varchar(36),
	`kind` varchar(16) NOT NULL DEFAULT 'text',
	`body` text NOT NULL,
	`reply_to_id` varchar(36),
	`client_nonce` varchar(64),
	`forwarded` boolean NOT NULL DEFAULT false,
	`edited_at` datetime(3),
	`deleted_at` datetime(3),
	`system_kind` varchar(16),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `messages_sender_nonce_uq` UNIQUE(`sender_id`,`client_nonce`)
);
--> statement-breakpoint
CREATE TABLE `pinned_messages` (
	`conversation_id` varchar(36) NOT NULL,
	`message_id` varchar(36) NOT NULL,
	`pinned_by` varchar(36),
	`pinned_at` datetime(3) NOT NULL,
	CONSTRAINT `pinned_messages_conversation_id_message_id_pk` PRIMARY KEY(`conversation_id`,`message_id`)
);
--> statement-breakpoint
CREATE TABLE `poll_options` (
	`id` varchar(36) NOT NULL,
	`poll_id` varchar(36) NOT NULL,
	`label` varchar(255) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `poll_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `poll_votes` (
	`option_id` varchar(36) NOT NULL,
	`poll_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `poll_votes_option_id_user_id_pk` PRIMARY KEY(`option_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` varchar(36) NOT NULL,
	`message_id` varchar(36) NOT NULL,
	`question` varchar(500) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `polls_id` PRIMARY KEY(`id`),
	CONSTRAINT `polls_message_uq` UNIQUE(`message_id`)
);
--> statement-breakpoint
CREATE TABLE `saved_messages` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`message_id` varchar(36),
	`conversation_id` varchar(36),
	`thread_name` varchar(120),
	`author` varchar(120),
	`body` text,
	`note` text,
	`tag` varchar(16) NOT NULL DEFAULT 'reference',
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `saved_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `call_participants` (
	`id` varchar(36) NOT NULL,
	`call_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`state` varchar(12) NOT NULL DEFAULT 'invited',
	`joined_at` datetime(3),
	`left_at` datetime(3),
	`muted` boolean NOT NULL DEFAULT false,
	`camera_on` boolean NOT NULL DEFAULT true,
	`sharing` boolean NOT NULL DEFAULT false,
	CONSTRAINT `call_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `call_participants_call_user_uq` UNIQUE(`call_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `call_sessions` (
	`id` varchar(36) NOT NULL,
	`conversation_id` varchar(36),
	`created_by` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`state` varchar(12) NOT NULL DEFAULT 'ringing',
	`started_at` datetime(3) NOT NULL,
	`answered_at` datetime(3),
	`ended_at` datetime(3),
	`duration_sec` int NOT NULL DEFAULT 0,
	`recording` boolean NOT NULL DEFAULT false,
	`end_reason` varchar(32),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `call_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`kind` varchar(40) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` varchar(500),
	`data` json,
	`read_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`action` varchar(64) NOT NULL,
	`resource_type` varchar(48),
	`resource_id` varchar(64),
	`ip` varchar(45),
	`user_agent` varchar(300),
	`metadata` json,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_records` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`collection` varchar(48) NOT NULL,
	`record_id` varchar(64) NOT NULL,
	`data` json NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `workspace_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_records_record_uq` UNIQUE(`user_id`,`collection`,`record_id`)
);
--> statement-breakpoint
ALTER TABLE `auth_identities` ADD CONSTRAINT `auth_identities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_sessions` ADD CONSTRAINT `device_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_device_id_device_sessions_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_tokens` ADD CONSTRAINT `verification_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_requests` ADD CONSTRAINT `contact_requests_from_user_id_users_id_fk` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_requests` ADD CONSTRAINT `contact_requests_to_user_id_users_id_fk` FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_contact_user_id_users_id_fk` FOREIGN KEY (`contact_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_members` ADD CONSTRAINT `conversation_members_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_members` ADD CONSTRAINT `conversation_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_members` ADD CONSTRAINT `conversation_members_added_by_users_id_fk` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `read_cursors` ADD CONSTRAINT `read_cursors_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `read_cursors` ADD CONSTRAINT `read_cursors_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `media_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reactions` ADD CONSTRAINT `message_reactions_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reactions` ADD CONSTRAINT `message_reactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_receipts` ADD CONSTRAINT `message_receipts_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_receipts` ADD CONSTRAINT `message_receipts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reports` ADD CONSTRAINT `message_reports_reporter_id_users_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reports` ADD CONSTRAINT `message_reports_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pinned_messages` ADD CONSTRAINT `pinned_messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pinned_messages` ADD CONSTRAINT `pinned_messages_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pinned_messages` ADD CONSTRAINT `pinned_messages_pinned_by_users_id_fk` FOREIGN KEY (`pinned_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_options` ADD CONSTRAINT `poll_options_poll_id_polls_id_fk` FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_option_id_poll_options_id_fk` FOREIGN KEY (`option_id`) REFERENCES `poll_options`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_poll_id_polls_id_fk` FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `polls` ADD CONSTRAINT `polls_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_messages` ADD CONSTRAINT `saved_messages_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `call_participants` ADD CONSTRAINT `call_participants_call_id_call_sessions_id_fk` FOREIGN KEY (`call_id`) REFERENCES `call_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `call_participants` ADD CONSTRAINT `call_participants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `call_sessions` ADD CONSTRAINT `call_sessions_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `call_sessions` ADD CONSTRAINT `call_sessions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_records` ADD CONSTRAINT `workspace_records_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `auth_identities_user_idx` ON `auth_identities` (`user_id`);--> statement-breakpoint
CREATE INDEX `device_sessions_user_idx` ON `device_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX `verification_tokens_user_idx` ON `verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `contact_requests_pair_idx` ON `contact_requests` (`from_user_id`,`to_user_id`);--> statement-breakpoint
CREATE INDEX `contact_requests_to_idx` ON `contact_requests` (`to_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `contacts_owner_idx` ON `contacts` (`owner_id`);--> statement-breakpoint
CREATE INDEX `contacts_email_idx` ON `contacts` (`owner_id`,`email`);--> statement-breakpoint
CREATE INDEX `conversation_members_user_idx` ON `conversation_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `conversation_members_conv_idx` ON `conversation_members` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `conversation_members_pinned_idx` ON `conversation_members` (`user_id`,`pinned_at`);--> statement-breakpoint
CREATE INDEX `conversations_last_idx` ON `conversations` (`last_message_at`);--> statement-breakpoint
CREATE INDEX `conversations_creator_idx` ON `conversations` (`created_by`);--> statement-breakpoint
CREATE INDEX `media_owner_idx` ON `media` (`owner_id`);--> statement-breakpoint
CREATE INDEX `media_sha_idx` ON `media` (`sha256`);--> statement-breakpoint
CREATE INDEX `media_status_idx` ON `media` (`status`);--> statement-breakpoint
CREATE INDEX `message_attachments_message_idx` ON `message_attachments` (`message_id`);--> statement-breakpoint
CREATE INDEX `message_attachments_media_idx` ON `message_attachments` (`media_id`);--> statement-breakpoint
CREATE INDEX `message_reactions_message_idx` ON `message_reactions` (`message_id`);--> statement-breakpoint
CREATE INDEX `message_receipts_user_idx` ON `message_receipts` (`user_id`);--> statement-breakpoint
CREATE INDEX `message_reports_reporter_idx` ON `message_reports` (`reporter_id`);--> statement-breakpoint
CREATE INDEX `message_reports_message_idx` ON `message_reports` (`message_id`);--> statement-breakpoint
CREATE INDEX `messages_conv_created_idx` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `messages_reply_idx` ON `messages` (`reply_to_id`);--> statement-breakpoint
CREATE INDEX `poll_options_poll_idx` ON `poll_options` (`poll_id`);--> statement-breakpoint
CREATE INDEX `poll_votes_poll_idx` ON `poll_votes` (`poll_id`);--> statement-breakpoint
CREATE INDEX `saved_messages_user_idx` ON `saved_messages` (`user_id`);--> statement-breakpoint
CREATE INDEX `call_participants_call_idx` ON `call_participants` (`call_id`);--> statement-breakpoint
CREATE INDEX `call_sessions_conv_idx` ON `call_sessions` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `call_sessions_creator_idx` ON `call_sessions` (`created_by`);--> statement-breakpoint
CREATE INDEX `call_sessions_state_idx` ON `call_sessions` (`state`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `audit_events_actor_idx` ON `audit_events` (`actor_id`);--> statement-breakpoint
CREATE INDEX `audit_events_resource_idx` ON `audit_events` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `audit_events_action_idx` ON `audit_events` (`action`);--> statement-breakpoint
CREATE INDEX `workspace_records_collection_idx` ON `workspace_records` (`user_id`,`collection`);