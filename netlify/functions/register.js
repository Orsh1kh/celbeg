// netlify/functions/register.js
// Production дээр: OTP шалгах + DB-д хэрэглэгч хадгалах + JWT буцаах

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { name, phone, type, otp } = JSON.parse(event.body);

    if (!name || !phone || !type || !otp) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Мэдээлэл дутуу байна' })
      };
    }

    if (!name.trim()) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, message: 'Нэрээ оруулна уу' })
      };
    }

    if (String(otp).length < 6) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, message: 'OTP код буруу байна' })
      };
    }

    // Demo горим: амжилттай бүртгэгдсэн гэж үзнэ
    // Production дээр:
    //   1. shared OTP store-аас шалгана
    //   2. DB-д хэрэглэгч оруулна (давхардал шалгана)
    //   3. JWT session token буцаана
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, name: name.trim() })
    };

  } catch (err) {
    console.error('register error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Серверийн алдаа гарлаа' })
    };
  }
};
