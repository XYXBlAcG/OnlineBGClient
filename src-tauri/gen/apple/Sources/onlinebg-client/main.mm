#include "bindings/bindings.h"

@class OnlineBGVoiceNativePlugin;

static OnlineBGVoiceNativePlugin *voiceNativePlugin;

extern "C" __attribute__((used, visibility("default"))) void *init_plugin_voice_native(void) {
	if (!voiceNativePlugin) voiceNativePlugin = [[OnlineBGVoiceNativePlugin alloc] init];
	return (__bridge void *)voiceNativePlugin;
}

int main(int argc, char * argv[]) {
	ffi::start_app();
	return 0;
}
