// netlify/functions/verify-otp.js
// Production дээр send-sms.js-тэй shared Redis/DB store ашиглана

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { phone, otp } = JSON.parse(event.body);

    if (!phone || !otp) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Утас эсвэл OTP дутуу байна' })
      };
    }

    // Demo горим: 6 оронтой дурын код зөвшөөрнө
    // Production дээр send-sms-тэй shared store-аас шалгана
    if (String(otp).length === 6) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: false, message: 'OTP код буруу байна' })
    };

  } catch (err) {
    console.error('verify-otp error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Серверийн алдаа гарлаа' })
    };
  }
};
