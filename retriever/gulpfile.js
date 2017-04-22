const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject(__dirname + '/tsconfig.json');

gulp.task('typescript', () => {
  return tsProject.src()
    .pipe(tsProject())
    .js.pipe(gulp.dest(__dirname + '/dist'));
});

gulp.task('default', ['typescript']);