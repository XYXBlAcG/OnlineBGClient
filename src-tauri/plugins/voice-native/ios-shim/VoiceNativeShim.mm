#import <Foundation/Foundation.h>

@interface OnlineBGVoiceNativePlugin : NSObject
@end

static OnlineBGVoiceNativePlugin *voiceNativePlugin;

extern "C" void *init_plugin_voice_native(void) {
	if (!voiceNativePlugin) voiceNativePlugin = [[OnlineBGVoiceNativePlugin alloc] init];
	return (__bridge void *)voiceNativePlugin;
}
