#!/usr/bin/env node
/**
 * 🧪 Test Notification Script
 * Usage: node scripts/sendTestNotification.js <fcmToken> [title] [body]
 * 
 * Example:
 * node scripts/sendTestNotification.js "YOUR_FCM_TOKEN_HERE" "Test Title" "Test Body"
 */

import { sendPushNotification } from '../firebase/firebaseAdmin.js';

const args = process.argv.slice(2);
const fcmToken = args[0];
const title = args[1] || '🧪 Test Notification';
const body = args[2] || 'Sent from Kiro! Check if you receive this ✅';

if (!fcmToken) {
  console.error('❌ FCM token is required');
  console.log('\nUsage: node scripts/sendTestNotification.js <fcmToken> [title] [body]');
  console.log('\nExample:');
  console.log('  node scripts/sendTestNotification.js "cP163jo1TOOq..." "Hello" "Test message"');
  process.exit(1);
}

console.log('📤 Sending test notification...');
console.log('Token:', fcmToken.substring(0, 40) + '...');
console.log('Title:', title);
console.log('Body:', body);
console.log('');

sendPushNotification({
  token: fcmToken,
  title,
  body,
  data: {
    type: 'test_message',
    timestamp: new Date().toISOString(),
  },
})
  .then((result) => {
    console.log('✅ Test notification sent!');
    console.log('Message ID:', result.messageId);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to send notification');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  });
