#!/usr/bin/env ruby
# frozen_string_literal: true

# Syntax-check and evaluate every custom module podspec.
# ruby -c alone is not enough: JavaScript's __dirname is valid Ruby syntax
# but NameError at load time (CocoaPods / pod install).

require 'json'
require 'open3'

ROOT = File.expand_path('..', __dir__)
JS_LEFTOVERS = [
  /\b__dirname\b/,
  /\b__filename\b/,
  /\bmodule\.exports\b/,
  /\bexports\./,
  /\bprocess\.cwd\b/,
  /\brequire\s*\(\s*['"]path['"]/,
].freeze

module Pod
  class Spec
    class Dummy
      attr_reader :assigned

      def initialize
        @assigned = {}
      end

      def method_missing(name, *args, **_kwargs, &_block)
        key = name.to_s.sub(/=\z/, '')
        @assigned[key] = args.size <= 1 ? args[0] : args
        self
      end

      def respond_to_missing?(_name, _include_private = false)
        true
      end
    end

    class << self
      attr_accessor :last
    end

    def self.new
      spec = Dummy.new
      yield spec if block_given?
      self.last = spec
      spec
    end
  end
end

def find_podspecs
  Dir.chdir(ROOT) do
    Dir.glob('**/*.podspec').reject do |p|
      p.split('/').any? { |part| %w[node_modules Pods dist .git].include?(part) }
    end.sort
  end
end

def js_leftovers(src)
  JS_LEFTOVERS.select { |re| src.match?(re) }
end

def syntax_ok?(path)
  _out, err, status = Open3.capture3('ruby', '-c', path)
  [status.success?, err]
end

def evaluate(path)
  Pod::Spec.last = nil
  src = File.read(path)
  eval(src, nil, File.expand_path(path), 1)
  spec = Pod::Spec.last
  raise 'Pod::Spec.new was not evaluated' unless spec
  raise 'podspec did not set s.name' if spec.assigned['name'].to_s.empty?
  raise 'podspec did not set s.version from package.json' if spec.assigned['version'].to_s.empty?
  spec
end

podspecs = find_podspecs
if podspecs.empty?
  warn 'No podspecs found'
  exit 1
end

failures = 0
podspecs.each do |rel|
  path = File.join(ROOT, rel)
  src = File.read(path)
  puts "== #{rel}"

  leftovers = js_leftovers(src)
  unless leftovers.empty?
    failures += 1
    puts "  FAIL non-Ruby leftovers: #{leftovers.map(&:inspect).join(', ')}"
    next
  end

  ok, err = syntax_ok?(path)
  unless ok
    failures += 1
    puts "  FAIL ruby -c: #{err.strip}"
    next
  end
  puts '  ruby -c: Syntax OK'

  begin
    spec = evaluate(path)
    pkg_path = File.expand_path('../package.json', File.dirname(path))
    pkg = JSON.parse(File.read(pkg_path))
    if spec.assigned['version'] != pkg['version']
      raise "s.version #{spec.assigned['version'].inspect} != package.json #{pkg['version'].inspect}"
    end
    puts "  eval: name=#{spec.assigned['name']} version=#{spec.assigned['version']}"
  rescue StandardError => e
    failures += 1
    puts "  FAIL eval: #{e.class}: #{e.message}"
  end
end

if failures.positive?
  warn "\n#{failures} podspec(s) failed"
  exit 1
end

puts "\n#{podspecs.size} podspec(s) passed ruby -c and evaluation"
