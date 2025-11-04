import https from "https";
import axios from "axios";

// utils/sendOTP.js
export const sendOTP = (phone, otp) => {
  // For now, we'll simulate sending OTP. You can integrate an SMS service like Twilio here.
  console.log(`Sending OTP: ${otp} to phone: ${phone}`);
  // Example: Twilio.sendSMS(phone, otp);
};



const agent = new https.Agent({  
  rejectUnauthorized: false  // ignore invalid certs
});



export const sendWhatsappOTP = async (phone, otp) => {

  try {
    // http://wa.techrush.in/api/http-authkey.php?authkey=37327369626f6f6b3130301742449394&route=2&number=enternumber&message=hello there
    const whatsappBaseUrl = `http://wa.techrush.in/api/http-authkey.php?authkey=37327369626f6f6b3130301742449394&route=2`;
    // const whatsappBaseUrl = `http://whatsapp.ut1.in/api/http-authkey.php?authkey=37327369626f6f6b3130301742449394&route=2`;
    const message = `Dear Customer, Your Mobile Verification OTP is: ${otp}. Please enter this OTP to verify your mobile number.`;
    const encodedMessage = encodeURIComponent(message);
    const fullUrl = `${whatsappBaseUrl}&number=91${phone}&message=${message}`;
    
    const response = await axios.post(fullUrl, {}, { httpsAgent: agent });
  return response.data;
  } catch (error) {
    console.error(`Failed to send WhatsApp OTP to ${phone}:`, error.message);
    return null;
  }
};