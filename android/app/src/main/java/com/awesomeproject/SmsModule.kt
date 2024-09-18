package com.awesomeproject

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Telephony
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var smsReceiver: BroadcastReceiver? = null

    override fun getName(): String {
        return "SmsModule"
    }

    @ReactMethod
    fun startSmsListener() {
        val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
        smsReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
                    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                    for (sms in messages) {
                        val sender = sms.displayOriginatingAddress
                        val message = sms.messageBody
                        sendEvent("smsReceived", "{\"sender\":\"$sender\",\"message\":\"$message\"}")
                    }
                }
            }
        }
        reactApplicationContext.registerReceiver(smsReceiver, filter)
    }

    @ReactMethod
    fun stopSmsListener() {
        smsReceiver?.let {
            reactApplicationContext.unregisterReceiver(it)
            smsReceiver = null
        }
    }

    @ReactMethod
    fun isModuleAvailable(promise: Promise) {
        promise.resolve(true)
    }

    private fun sendEvent(eventName: String, message: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, message)
    }
}