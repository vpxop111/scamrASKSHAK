package com.awesomeproject

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.awesomeproject.PhoneRecorderPackage // Import your package

class MainApplication : Application(), ReactApplication {

    private val mReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this).packages.toMutableList()
            // Add your package here
            packages.add(new CallRecorderPackage());
            return packages
        }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

    override val reactNativeHost: ReactNativeHost
        get() = mReactNativeHost

    override val reactHost: ReactHost
        get() = DefaultReactNativeHost.getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            DefaultNewArchitectureEntryPoint.load()
        }
    }
}