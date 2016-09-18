'use strict';
/**
 * @file gruntfile
 * @subpackage main
 * @version 0.0.1
 * @author hex7c0 <hex7c0@gmail.com>
 * @copyright hex7c0 2015
 * @license GPLv3
 */

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*\n' + ' * <%= pkg.name %> v<%= pkg.version %>\n'
      + ' * (c) <%= pkg.author.name %> <%= pkg.homepage %>\n'
      + ' * Licensed under <%= pkg.license %>\n' + ' */\n',

    clean: [ 'index.min.js', 'min/**/*.js' ],

    uglify: {
      target: {
        options: {
          mangle: false,
          beautify: true
        },
        files: [ {
          expand: true,
          src: 'lib/**/*.js',
          dest: 'min'
        }, {
          expand: true,
          src: 'module/**/*.js',
          dest: 'min'
        }, {
          'index.min.js': 'index.js'
        } ]
      }
    },

    jshint: {
      options: {
        curly: true,
        indent: 2,
        quotmark: 'single',
        undef: true,
        unused: true,
        strict: true,
        node: true,
        // relax
        laxbreak: true,
        loopfunc: true,
        shadow: true
      },
      target: {
        src: [ 'lib/**/*.js', 'module/**/*.js', 'index.js' ]
      }
    },

    shell: {
      options: {
        failOnError: false
      },
      docs: {
        command: 'jsdoc ./lib/*.js ./module/*.js -c .jsdoc.json'
      }
    },

    safer: {
      target: {
        files: [ {
          src: 'lib/**/*.js'
        }, {
          src: 'module/**/*.js'
        }, {
          src: 'index.js',
        } ]
      }
    },

    endline: {
      target: {
        files: [ {
          src: 'lib/**/*.js'
        }, {
          src: 'min/**/*.js'
        }, {
          src: 'module/**/*.js'
        }, {
          src: '*.js',
        } ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-endline');
  grunt.loadNpmTasks('grunt-safer-regex');

  grunt.registerTask('lint', [ 'jshint', 'safer' ]);
  grunt.registerTask('min', [ 'uglify', 'endline' ]);
  grunt.registerTask('default', [ 'lint', 'min' ]);

  return;
};
