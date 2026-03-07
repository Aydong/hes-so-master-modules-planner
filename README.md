# Master Course Planner 🎓

> [!NOTE]
> *This project is a fork of @NoeBerdoz's original work, adapted to support all HES-SO Master's programmes and add new features and improvements. The core functionality and design have been preserved.*
> [Original Repository](https://github.com/NoeBerdoz/hes-so-master-modules-planner)

> [!CAUTION]
> This is an **unofficial** tool created by a student for students. It is not affiliated with MSE and may not be 100% accurate. Always double-check with official sources and your academic advisor before making decisions based on this planner.
>  
> [HES-SO Master Official link](https://www.hes-so.ch/master/hes-so-master/formations/engineering/)

 

**A simple tool to plan your HES-SO Master of Science in Engineering's degree.**

This application helps you choose your courses, organize your schedule, and make sure you meet all the requirements for your degree.

**You can access the tool here:** https://aydong.github.io/hes-so-master-modules-planner/

<img width="1868" height="1012" alt="image" src="https://github.com/user-attachments/assets/26fa9821-4bd7-40d3-8df9-eb095de31b0c" />

## Who is this for? 👀

This tool is designed for **HES-SO Master's students** in the following majors.

| Master | Specializations |
|--------|----------------|
| Civil Engineering (CE) | Structures - Geotechnical - Hydraulics - Transport |
| Computer Science (CS) | Software Engineering - Embedded Systems - Cybersecurity - Communication Systems |
| Data Science (DS) | — |
| Electrical Engineering (ElE) | Signal - Power |
| Energy and Environment (EnEn) | — |
| Information and Cyber Security (ICS) | — |
| Mechanical Engineering (ME) | — |
| Microengineering (Mic) | Biomedical - Watchmaking - Microsystems - Production |


## What can you do? 🚀

-   **Plan your 2 years**: Organize your courses over up to 4 semesters.
-   **Check the rules**: The app automatically checks if you have enough credits in each category (TSM, FTP, MA, CM...).
-   **Avoid conflicts**: See immediately if two courses happen at the same time.
-   **Get travel warnings**: If you have back-to-back courses on different campuses, you'll get a warning. (you can ignore it if you have a teleportation device in your backpack)
-   **Save your plan**: Your selection is saved automatically in your browser.
-   **Export / Import**: You can export your plan as a JSON file (or PDF) and import it later or share it with your best friends !
-   **Access course info**: Click on a course to open its description.

## How to use it 🛠️

### 1. Add Courses
Use the panel on the right to find courses. You can search by name or filter by:
-   **Semester** (S1 or S2)
-   **Type** (Recommended or Optional)
-   **Day** of the week

Click **"Add to Year 1"** or **"Add to Year 2"** to put the course in your schedule.

You can also click on a block in the calendar to open the course picker pre-filtered for that time slot.

<img width="232" height="133" alt="image" src="https://github.com/user-attachments/assets/b72b9583-64d2-4542-94de-9a3847d2daf8" />


### 2. Check your Schedule
The main calendar shows your week.
-   Use the tabs (**S1, S2, S3, S4**) to switch between semesters.
-   See the **Location** of each course on the card.
-   **Red cards** mean there is a time conflict!

<img width="1551" height="715" alt="image" src="https://github.com/user-attachments/assets/9e9427ba-51d5-4ae0-aed4-df769607f586" />

### 3. Verify Credits
The toolbar displays live progress bars for each module category applicable to your programme (TSM, FTP, MA, CM, MAP, CSI...):

- **Bar fill** shows current ECTS vs. the maximum allowed
- **Rec: X/Y** below each bar shows whether you meet the recommended minimum (green = met, red = not met)
- **Bonus dots** show extra ECTS beyond the category limit — dots turn red if the bonus allowance is exceeded
- The header badge turns **green** (valid), **orange** (collision detected), or **red** (credit rules not satisfied)


<img width="290" height="466" alt="image" src="https://github.com/user-attachments/assets/77d1dc6e-24cd-41a7-b1e1-922193b716b3" />


## Run it locally 💻

If you want to run the code on your own computer:

1.  Install dependencies: `npm install`
2.  Start the app: `npm run dev`
3.  Build for production: `npm run build`
