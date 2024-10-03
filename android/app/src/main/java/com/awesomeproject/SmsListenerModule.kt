package com.awesomeproject

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.telephony.SmsMessage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Callback // Import the Callback interface
import android.util.Log // Import Log for logging

class SmsListenerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var isListening = false // Track the listening state

    init {
        Log.d("SmsListenerModule", "SmsListenerModule initialized")
    }

    override fun getName(): String {
        return "SmsListenerModule"
    }

    private fun sendEvent(eventName: String, message: String) {
        Log.d("SmsListenerModule", "Sending event: $eventName with message: $message")
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, message)
    }

    private fun registerSMSReceiver() {
        if (isListening) {
            Log.d("SmsListenerModule", "Already listening for SMS messages.")
            return
        }

        val smsReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                Log.d("SmsListenerModule", "SMS Broadcast received")
                val extras = intent.extras
                if (extras != null) {
                    Log.d("SmsListenerModule", "Extras found: ${extras.keySet()}")
                    val pdus = extras.get("pdus") as Array<*>
                    for (pdu in pdus) {
                        val sms = SmsMessage.createFromPdu(pdu as ByteArray)
                        val messageBody = sms.messageBody
                        val senderPhoneNumber = sms.originatingAddress
                        val timestamp = sms.timestampMillis

                        val params: WritableMap = Arguments.createMap()
                        params.putString("messageBody", messageBody)
                        params.putString("senderPhoneNumber", senderPhoneNumber)
                        params.putDouble("timestamp", timestamp.toDouble())

                        Log.d("SmsListenerModule", "SMS received from: $senderPhoneNumber, message: $messageBody")
                        sendEvent("onSMSReceived", params.toString())
                    }
                } else {
                    Log.d("SmsListenerModule", "No extras found in the intent")
                }
            }
        }

        val filter = IntentFilter("android.provider.Telephony.SMS_RECEIVED")
        reactContext.registerReceiver(smsReceiver, filter)
        isListening = true // Update the listening state
        Log.d("SmsListenerModule", "SMS Receiver registered and listening for messages")
    }

    @ReactMethod
    fun startListeningToSMS() {
        Log.d("SmsListenerModule", "startListeningToSMS called")
        registerSMSReceiver()
    }

    @ReactMethod
    fun getLatestSms(callback: Callback) {
        // Implement the logic to get the latest SMS
        // For now, we'll just send a dummy message
        callback.invoke("This is a dummy SMS message")
    }

    fun emitSmsReceived(message: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onSmsReceived", message)
    }
}