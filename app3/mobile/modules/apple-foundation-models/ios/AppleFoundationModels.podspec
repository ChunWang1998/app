require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AppleFoundationModels'
  s.version        = package['version']
  s.summary        = 'On-device Apple Foundation Models for Been Ages'
  s.description    = 'On-device SystemLanguageModel wrapper. Never uses Private Cloud Compute.'
  s.author         = 'Been Ages'
  s.homepage       = 'https://github.com/chunwang1998/app'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '17.0' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.weak_frameworks = 'FoundationModels'
  s.source_files = '*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
