// CallRecorderModule.kt
package com.awesomeproject

import android.content.Context
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallRecorderModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var phoneStateListener: PhoneStateListener? = null
    private var telephonyManager: TelephonyManager? = null

    override fun getName(): String = "CallRecorderModule"

    @ReactMethod
    fun startListening(callback: Callback) {
        telephonyManager = reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        phoneStateListener = object : PhoneStateListener() {
            override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                super.onCallStateChanged(state, phoneNumber)
                
                val stateString = when (state) {
                    TelephonyManager.CALL_STATE_IDLE -> "IDLE"
                    TelephonyManager.CALL_STATE_OFFHOOK -> "OFFHOOK"
                    TelephonyManager.CALL_STATE_RINGING -> "RINGING"
                    else -> "UNKNOWN"
                }

                val params = Arguments.createMap().apply {
                    putString("state", stateString)
                    putString("phoneNumber", phoneNumber)
                }

                sendEvent("phoneStateChanged", params)
            }
        }

        telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
    }

    @ReactMethod
    fun stopListening() {
        telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}