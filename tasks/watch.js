import gulp from 'gulp';
import { join } from 'path';
import { server, srcDirectory } from './config';

const browserSync = require('browser-sync').create();

function watchChanges() {
  browserSync.init({
    notify: false,
    logPrefix: 'BP',
    port: server.port,
    server: server.serve,
  });

  gulp.watch(join(srcDirectory, 'templates', '**', '*.jade'), ['markup']);
  gulp.watch(join(srcDirectory, 'images', '**', '*'), ['images']);
  gulp.watch(join(srcDirectory, 'styles', '**', '*.scss'), ['styles']);
  gulp.watch(join(srcDirectory, 'scripts', '**', '*.js'), ['lint']);
}

gulp.task('watch', watchChanges);

export default browserSync;
