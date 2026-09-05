plugins {
    id("com.android.application")
}

val releaseKeystorePath = providers.environmentVariable("KR3_KEYSTORE_PATH")
val releaseKeystorePassword = providers.environmentVariable("KR3_KEYSTORE_PASSWORD")
val releaseKeyAlias = providers.environmentVariable("KR3_KEY_ALIAS")
val releaseKeyPassword = providers.environmentVariable("KR3_KEY_PASSWORD")

android {
    namespace = "com.quantdeus.spacerangers3"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.quantdeus.spacerangers3"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "0.2.0"
    }

    signingConfigs {
        create("release") {
            if (releaseKeystorePath.isPresent) {
                storeFile = file(releaseKeystorePath.get())
                storePassword = releaseKeystorePassword.orNull
                keyAlias = releaseKeyAlias.orNull
                keyPassword = releaseKeyPassword.orNull
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = false
            isDebuggable = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    packaging {
        resources.excludes += setOf("META-INF/DEPENDENCIES", "META-INF/LICENSE*", "META-INF/NOTICE*")
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
