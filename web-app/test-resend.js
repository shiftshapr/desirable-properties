const { Resend } = require('resend');

async function testResend() {
  console.log('🔍 Testing Resend API...');
  
  try {
    const resend = new Resend('re_P3kbFRcL_EchKFL9hKCLzxecwbwrefjKp');
    
    console.log('🔍 Sending test email...');
    
    const result = await resend.emails.send({
      from: 'The Meta Layer <onboarding@resend.dev>',
      to: 'themetalayer@gmail.com',
      subject: 'Test Email from Resend',
      html: '<p>This is a test email to verify Resend is working.</p>',
    });
    
    console.log('✅ Resend result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Resend error:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
  }
}

testResend();
