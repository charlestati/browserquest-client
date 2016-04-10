import gulp from 'gulp';
import runSequence from 'run-sequence';

function buildProject() {
  return runSequence('images:build', 'styles:build', 'scripts:build', 'markup:build', 'copy');
}

gulp.task('build', ['clean'], buildProject);
