-- Only the disposable test server runs this bootstrap file.
-- Backslashes make underscores literal; % allows fresh per-run schemas.
GRANT ALL PRIVILEGES ON `ctp\_test\_%`.* TO 'ctp_test'@'%';
