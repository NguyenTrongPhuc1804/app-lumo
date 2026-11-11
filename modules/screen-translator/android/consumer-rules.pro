# ML Kit loads registrars named in AndroidManifest via reflection.
-keep class * implements com.google.firebase.components.ComponentRegistrar {
    public <init>();
}
