begin;

select plan(2);

select has_table(
  'auth',
  'users',
  'Supabase Auth should provide the users table'
);

select has_column(
  'auth',
  'users',
  'id',
  'Supabase Auth users should have an id column'
);

select * from finish();

rollback;
