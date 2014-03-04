module.exports = function(grunt) {
  // Project configuration.
  sources = ['app/js/*.js', 'app/js/controllers/*.js', 'app/js/models/*.js', 'app/js/services/*.js'];
  grunt.initConfig({
    concat : {
      dist: {
        src: sources,
        dest: 'build/ircboks.js'
      }
    },
    jshint: {
      options: {
        browser: true
      },
      all: sources
    },
    uglify: {
      dist: {
        files: {
          'build/ircboks.min.js': ['build/ircboks.js']
        }
      }
    },
    copy: {
      main: {
        files: [
          {expand: true, flatten:true, src: ['app/index.html'], dest: 'build/'},
          {expand: true, flatten:true, src: ['app/partials/*'], dest: 'build/partials/'},
          {expand: true, flatten:true, src: ['app/lib/*'], dest: 'build/lib/'},
          {expand: true, flatten:true, src: ['app/css/*'], dest: 'build/css/'},
        ]
      }
    }
  });

  // Load tasks from "grunt-sample" grunt plugin installed via Npm.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');

  // Default task.
  grunt.registerTask('lint', 'jshint');
  grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'copy']);

};
