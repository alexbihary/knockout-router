/* global module */
module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    banner: '/*!\n' +
            ' * knockout-router v<%= pkg.version %> <%= pkg.homepage %>\n' +
            ' * Copyright <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under <%= _.pluck(pkg.licenses, "type") %> (<%= _.pluck(pkg.licenses, "url") %>)\n' +
            ' */\n',

    clean: {
      dist: 'dist'
    },

    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: false
      },
      dist: {
        src: 'src/*.js',
        dest: 'dist/<%= pkg.name %>.js'
      }
    },

    connect: {
      server: {
        options: {
          port: 3000,
          hostname: 'localhost',
          base: '.'
        }
      },
      external: {
        options: {
          port: 4000,
          hostname: '0.0.0.0',
          base: '.'
        }
      }
    },

    copy: {
      src: {
        expand: true,
        flatten: true,
        src: 'src/*.js',
        dest: 'dist/'
      }
    },

    jshint: {
      options: 'js/.jshintrc',
      files: ['Gruntfile.js', 'js/**/*.js']
    },

    open: {
      dist: {
        path: 'http://localhost:<%= connect.server.options.port %>/'
      }
    },

    uglify: {
      dev: {
        options: {
          banner: '<%= banner %>',
          report: 'min'
        },
        files: [{
          src: 'dist/knockout-history.js',
          dest: 'dist/knockout-history.min.js'
        }, {
          src: 'dist/knockout-router.js',
          dest: 'dist/knockout-router.min.js'
        }]
      }
    },

    usebanner: {
      dist: {
        options: {
          position: 'top',
          banner: '<%= banner %>'
        },
        files: {
          src: 'dist/css/*.css'
        }
      }
    },

    watch: {
      options: {
        livereload: true
      },
      js: {
        files: 'js/**/*.js',
        tasks: ['clean', 'dist']
      },
      html: {
        files: ['index.html', 'examples/**/*']
      }
    }
  });

  require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});

  grunt.registerTask('dev-open', ['connect', 'open', 'watch']);
  //grunt.registerTask('dev', ['connect', 'watch']);
  //grunt.registerTask('test', []);
  grunt.registerTask('dist', ['clean', 'uglify']);
  grunt.registerTask('default', 'dist');
};