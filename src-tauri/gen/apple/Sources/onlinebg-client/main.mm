#include "bindings/bindings.h"
#import <Foundation/Foundation.h>

@interface OnlineBGVoiceNativePlugin : NSObject
@end

static OnlineBGVoiceNativePlugin *voiceNativePlugin;

extern "C" void *init_plugin_voice_native(void);
static void *const voiceNativeEntry __attribute__((used)) = (void *)&init_plugin_voice_native;

extern "C" __attribute__((used, visibility("default"))) void *init_plugin_voice_native(void) {
	if (!voiceNativePlugin) voiceNativePlugin = [[OnlineBGVoiceNativePlugin alloc] init];
	return (__bridge void *)voiceNativePlugin;
}

int main(int argc, char * argv[]) {
	ffi::start_app();
	return 0;
}
