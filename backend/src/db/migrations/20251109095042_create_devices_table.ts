import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('devices', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('fcm_token', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // user_idとfcm_tokenの組み合わせでユニーク制約
    table.unique(['user_id', 'fcm_token']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('devices');
}

