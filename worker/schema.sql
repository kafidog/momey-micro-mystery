CREATE TABLE IF NOT EXISTS event_counts (
  day TEXT NOT NULL CHECK (day GLOB '????-??-??'),
  source TEXT NOT NULL CHECK (source IN ('threads_h1', 'threads_h2', 'threads_h3')),
  event_name TEXT NOT NULL CHECK (
    event_name IN (
      'qa_valid_visit',
      'qa_gr_now',
      'qa_gr_today',
      'qa_solo_browse',
      'qa_pull_serious',
      'qa_pull_playful',
      'qa_pull_none',
      'sr_valid_visit',
      'sr_gr_now',
      'sr_gr_today',
      'sr_solo_browse',
      'sr_pull_serious',
      'sr_pull_playful',
      'sr_pull_none'
    )
  ),
  count INTEGER NOT NULL CHECK (count >= 1),
  PRIMARY KEY (day, source, event_name)
) WITHOUT ROWID;
