-- One-time: map legacy submitter identity to Anon / noreply@themetalayer.org
-- Run from web-app: npx prisma db execute --schema prisma/schema.prisma --file scripts/anonymize-daveed-users.sql
UPDATE users
SET
  email = 'noreply@themetalayer.org',
  "firstName" = 'Anon',
  "lastName" = '',
  "userName" = 'Anon'
WHERE LOWER(email) = LOWER('daveed@bridgit.io');
