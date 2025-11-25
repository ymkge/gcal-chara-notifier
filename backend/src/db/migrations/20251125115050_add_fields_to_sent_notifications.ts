import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('sent_notifications', (table) => {
    table.text('response'); // FCMからの成功レスポンスを保存
    table.text('error_message'); // エラーメッセージを保存
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('sent_notifications', (table) => {
    table.dropColumn('response');
    table.dropColumn('error_message');
  });
}