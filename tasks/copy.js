import gulp from 'gulp';
import { join } from 'path';
import { srcDirectory, distDirectory } from './config';

function copyFonts() {
  return gulp.src(join(srcDirectory, 'fonts', '**', '*'))
    .pipe(gulp.dest(join(distDirectory, 'fonts')));
}

function copyMaps() {
  return gulp.src(join(srcDirectory, 'maps', '**', '*'))
    .pipe(gulp.dest(join(distDirectory, 'maps')));
}

function copySprites() {
  return gulp.src(join(srcDirectory, 'sprites', '**', '*'))
    .pipe(gulp.dest(join(distDirectory, 'sprites')));
}

function copyServiceWorkers() {
  return gulp.src(join(srcDirectory, 'scripts', 'sw', '**', '*'))
    .pipe(gulp.dest(join(distDirectory, 'scripts', 'sw')));
}

function copyAudio() {
  return gulp.src(join(srcDirectory, 'audio', '**', '*'))
    .pipe(gulp.dest(join(distDirectory, 'audio')));
}

function copyConfig() {
  return gulp.src(join(srcDirectory, 'config', '**', '*'))
    .pipe(gulp.dest(join(distDirectory, 'config')));
}

function copyCursors() {
  return gulp.src(join(srcDirectory, 'cursors', '**', '*'))
    .pipe(gulp.dest(join(distDirectory, 'cursors')));
}

function copyRootFiles() {
  return gulp.src(join(srcDirectory, 'root', '**', '*'))
    .pipe(gulp.dest(join(distDirectory)));
}

function copyLibraries() {
  return gulp.src(join(srcDirectory, 'scripts', 'lib', '**', '*'))
    .pipe(gulp.dest(join(distDirectory, 'scripts', 'lib')));
}

gulp.task('copy-fonts', copyFonts);
gulp.task('copy-maps', copyMaps);
gulp.task('copy-sprites', copySprites);
gulp.task('copy-sw', copyServiceWorkers);
gulp.task('copy-audio', copyAudio);
gulp.task('copy-config', copyConfig);
gulp.task('copy-cursors', copyCursors);
gulp.task('copy-root-files', copyRootFiles);
gulp.task('copy-libraries', copyLibraries);
gulp.task('copy', [
  'copy-fonts',
  'copy-maps',
  'copy-sprites',
  'copy-sw',
  'copy-audio',
  'copy-config',
  'copy-cursors',
  'copy-root-files',
  'copy-libraries',
]);
