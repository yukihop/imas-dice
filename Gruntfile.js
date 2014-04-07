module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jade');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-typescript');

  grunt.initConfig({
    less: {
      all: {
        files: {
          'css/style.css': ['css/style.less']
        }
      }
    },
    jade: {
      options: {
        pretty: true
      },
      all: {
        files: [
          {
            expand: true,
            src: ['**/*.jade'],
            dest: '',
            ext: '.html'
          }
        ]
      }
    },
    typescript: {
      all: {
        files: { 'js/main.js': ['js/main.ts'] },
        options: {
          target: "ES5"
        }
      }
    },
    watch: {
      less: {
        files: ['css/style.less'],
        tasks: ['less']
      },
      jade: {
        files: ['**/*.jade'],
        tasks: ['jade']
      },
      typescript: {
        files: ['**/*.ts'],
        tasks: ['typescript']
      }
    }
  });

  grunt.registerTask('default', ['less', 'jade', 'typescript']);
};