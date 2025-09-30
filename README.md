# 🌿 Thyme

_**Thyme** is a stopwatch in your taskbar with history, notes and a [Kimai](https://www.kimai.org) integration._

## Installation

**Windows:** Download and run the latest installer from the [release page](https://github.com/JupiterPi/thyme/releases/latest). 

**Linux:** Download the latest AppImage from the [release page](https://github.com/JupiterPi/thyme/releases/latest), make it executable (`chmod a+x thyme-*`) and run it. Note that not every desktop environment supports tray icons out-of-the-box (on GNOME, you can install [Extension Manager](https://github.com/mjakeman/extension-manager) and install the "AppIndicator and KStatusNotifierItem Support" extension). 

**Other platforms:** As of now, you'll have to build from source: `git clone https://github.com/JupiterPi/thyme && cd thyme && npm i && npm run build`

## Features

- The **tray icon** is an activity indicator that lights up green/gray to indicate that the stopwatch is/isn't running. Click it to toggle the stopwatch. Double-click to show/hide the UI window(s).
- Every time you stop the stopwatch, an **entry is saved to the history** including the start and end time. 
- Save small **notes** at any time to document what you're doing.
- The small **dashboard** shows you information about a running stopwatch. 
- The **history** page displays all entries in chronological order and grouped by day.
- **Advanced editing:** Edit entries' start and end times, delete them, merge two entries, insert entries, insert pauses...
- The **timeline** page displays one day's entries like a calendar.
- Export your data in CSV format.
- **[Kimai](https://www.kimai.org) integration:** Simply bring your domain and API key. Choose a project and activity from Kimai for new entries. All future entries will be synced to Kimai, including notes.

Thyme is in development, and more features are on the way. 

I hope you enjoy using Thyme 🌿