require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AudioMeasurementSession'
  s.version        = package['version']
  s.summary        = 'AVAudioSession measurement mode for the decibel meter'
  s.description    = 'Sets AVAudioSession category playAndRecord and mode measurement while metering, after expo-audio configures the session.'
  s.author         = 'Decibel Meter'
  s.homepage       = 'https://github.com/tinytoolshedhq/app'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation'
  s.source_files = '*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
