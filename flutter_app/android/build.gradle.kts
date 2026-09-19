allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Some plugins still ship with older compileSdk — force every Android
// subproject up to 36 so AAR metadata checks pass.
subprojects {
    afterEvaluate {
        if (project.plugins.hasPlugin("com.android.library")) {
            project.extensions.configure<com.android.build.api.dsl.LibraryExtension>("android") {
                val cs = compileSdk
                if (cs == null || cs < 36) compileSdk = 36
            }
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
