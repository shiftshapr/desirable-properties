const { Resend } = require('resend');

async function testResend() {
  console.log('🔍 Testing Resend API...');
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ Set RESEND_API_KEY in your environment first.');
    process.exit(1);
  }
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
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
