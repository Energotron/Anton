plugins {
    id("com.android.application")
}

android {
    namespace = "com.quantdeus.spacerangers3"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.quantdeus.spacerangers3"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    packaging {
        resources.excludes += setOf("META-INF/DEPENDENCIES", "META-INF/LICENSE*", "META-INF/NOTICE*")
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
