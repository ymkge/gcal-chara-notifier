"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('email').unique().notNullable();
        table.timestamps(true, true);
    });
    await knex.schema.createTable('google_accounts', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
        table.string('google_email').notNullable();
        table.json('calendar_ids').notNullable();
        table.text('access_token').notNullable();
        table.text('refresh_token_encrypted').notNullable();
        table.bigInteger('token_expiry').notNullable();
        table.timestamps(true, true);
        table.unique(['user_id', 'google_email']);
    });
    await knex.schema.createTable('devices', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
        table.text('fcm_registration_token').notNullable().unique();
        table.string('platform'); // 'android', 'ios', 'web'
        table.timestamp('last_seen').defaultTo(knex.fn.now());
        table.timestamps(true, true);
    });
    await knex.schema.createTable('notification_prefs', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').unique();
        table.integer('lead_time_minutes').defaultTo(5).notNullable();
        table.string('character_image_url');
        table.timestamps(true, true);
    });
    await knex.schema.createTable('sent_notifications', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
        table.integer('account_id').unsigned().references('id').inTable('google_accounts').onDelete('SET NULL');
        table.string('event_id').notNullable();
        table.timestamp('scheduled_time').notNullable();
        table.timestamp('sent_at').defaultTo(knex.fn.now());
        table.string('status').notNullable(); // 'sent', 'failed'
        table.timestamps(true, true);
        table.unique(['account_id', 'event_id']);
    });
}
async function down(knex) {
    await knex.schema.dropTableIfExists('sent_notifications');
    await knex.schema.dropTableIfExists('notification_prefs');
    await knex.schema.dropTableIfExists('devices');
    await knex.schema.dropTableIfExists('google_accounts');
    await knex.schema.dropTableIfExists('users');
}
//# sourceMappingURL=20251108134850_create_initial_tables.js.map