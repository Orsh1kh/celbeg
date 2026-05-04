// netlify/functions/send-sms.js
// Twilio ашиглан OTP SMS илгээх

const otpStore = {}; // Production дээр Redis/DB ашиглана

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { phone } = JSON.parse(event.body);

    if (!phone || phone.length < 8) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Утасны дугаар буруу' })
      };
    }

    // 6 оронтой OTP үүсгэх
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 5 минут хадгалах
    otpStore[phone] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    // Twilio SMS илгээх
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE;

    if (!accountSid || !authToken) {
      // Demo mode — console-д харуулна
      console.log(`OTP for ${phone}: ${otp}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, demo: true })
      };
    }

    const client = require('twilio')(accountSid, authToken);

    // Монгол дугаар форматлах
    const formattedPhone = phone.startsWith('+') ? phone : '+976' + phone;

    await client.messages.create({
      body: `Celbeg.mn - Таны нэвтрэх код: ${otp}\n5 минутын дотор ашиглана уу.`,
      from: fromPhone,
      to: formattedPhone
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('SMS error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'SMS илгээхэд алдаа гарлаа' })
    };
  }
};
