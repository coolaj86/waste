Notifications Loop
=====

1. Broadcast a message immediately to all users of the system
2. Broadcast a message to users who have @gmail.com logins
3. Broadcast a message to users who have @gmail.com logins with their names
4. Broadcast a message from one user to another
5. Set an alarm to send a message to a user

Steps to broadcast
-----

Place the message in the user's message queue `$account.related('messages')`
Check the user's notification preferences `$account.get('preferences').notifications`
Get the list of the user's devices `$account.related('devices')`
Send the push notifications and record them as `sent_at`
When the device acknowledges the push, record as `received_at`
When the user takes action, record as `read_at`?
