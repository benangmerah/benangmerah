var gulp = require('gulp');
var ts = require('gulp-typescript');
var tsProject = ts.createProject(__dirname + '/tsconfig.json');

gulp.task('typescript', function() {
  return tsProject.src()
    .pipe(tsProject())
    .js.pipe(gulp.dest(__dirname + '/dist'));
});

gulp.task('default', gulp.parallel('typescript'));