module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jade');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-typescript');
  grunt.loadNpmTasks('grunt-yaml');

  grunt.initConfig({
    less: {
      all: {
        files: {
          'pub/css/style.css': ['css/style.less']
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
            src: ['talks/*.jade'],
            dest: 'pub',
            ext: '.html'
          },
          {
            expand: true,
            src: ['index.jade'],
            dest: 'pub',
            ext: '.html'
          }
        ]
      }
    },
    yaml: {
      options: {
        space: 0,
        customTypes: {
          '!include scalar': function(value, yamlLoader) {
            return yamlLoader(value);
          }
        }
      },
      all: {
        files: [
          {
            expand: true,
            src: ['settings/settings.yml'],
            dest: 'pub',
            ext: '.json'
          }
        ]
      }
    },
    typescript: {
      all: {
        files: { 'pub/js/main.js': ['js/main.ts'] },
        options: {
          target: "ES5",
          sourceMap: false
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
      yaml: {
        files: ['settings/*.yml'],
        tasks: ['yaml']
      },
      typescript: {
        files: ['**/*.ts'],
        tasks: ['typescript']
      }
    }
  });

  grunt.registerTask('default', ['less', 'jade', 'yaml', 'typescript']);
};