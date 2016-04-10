import gulp from 'gulp';
import rimraf from 'rimraf';
import { distDirectory } from './config';

function deleteDistDir(cb) {
  return rimraf(distDirectory, cb);
}

gulp.task('clean', deleteDistDir);
