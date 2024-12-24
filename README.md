# DASH - Distributed Automated Scheduler Hub

## What is DASH?
DASH is a distributed code execution and deployment system designed using **React**, **Firebase**, and **Tauri APIs**. It allows clients to submit code, schedule tasks, and execute them efficiently through connected nodes. DASH focuses on simplifying task scheduling and automating code execution workflows.

## Features
- **Task Scheduling**: Assigns pending tasks to idle clients automatically.
- **Distributed Execution**: Executes tasks in parallel across connected nodes.
- **Real-time Updates**: Uses Firebase for real-time communication and task updates.
- **Secure Code Handling**: Ensures code integrity and security throughout the execution pipeline.
- **Scalability**: Easily scalable with multiple connected nodes.

# Screenshots



![image](https://github.com/user-attachments/assets/1c0f25e2-1441-4011-8639-96c70539330f)

![image](https://github.com/user-attachments/assets/8f5e334e-5885-4fa2-b9fd-a5541ecc98ae)

![image](https://github.com/user-attachments/assets/030337eb-99b5-4c32-aa98-2c009affebd6)



## Architecture
```
1. Clients Submit Code: 
   - Code is submitted via Firebase with a 'pending' status.

2. Scheduler Monitors Tasks: 
   - Listens for pending tasks and assigns them to idle clients.

3. Clients Execute Tasks: 
   - Idle clients listen for assignments, execute code, and report results.

4. Result Reporting:
   - Execution results are updated in Firebase.

5. Notifications:
   - Original clients are notified of the results.
```

## Technical Details
### Frontend
- **Framework**: Tauri + Next.js
- **Styling**: Tailwind CSS
- **Tauri API**: Used for secure desktop interactions.

### Backend
- **Database**: Firebase Realtime Database and Firestore.
- **Deployment**: Scheduler in Cloud Functions

### Task Scheduler
- **Language**: Python
- **Libraries**: Firebase Admin SDK
- **Task Distribution**: Custom algorithm for dynamic task allocation.

## How It Works
1. **Initialize Dash** - Connect the app.
2. **Submit Code** - Clients upload code with metadata to Firebase.
3. **Scheduler Assignment** - Scheduler assigns pending tasks to idle clients.
4. **Execution & Reporting** - Clients execute the assigned code and update the results.

## Contributors
<table>
<tr>
    <td align="center">
        <a href="https://github.com/fal3n-4ngel">
            <img src="https://avatars.githubusercontent.com/u/79042374?v=4" width="100;" alt="Adithya Krishnan"/>
            <br />
            <sub><b>Adithya Krishnan</b></sub>
        </a>
    </td>
   <td align="center">
        <a href="https://github.com/Fer-Win">
            <img src="https://avatars.githubusercontent.com/u/102341775?v=4" width="100;" alt="Ferwin Lopez"/>
            <br />
            <sub><b>Ferwin Lopez</b></sub>
        </a>
    </td>
    <td align="center">
        <a href="https://github.com/neviaseb03">
            <img src="https://avatars.githubusercontent.com/u/101114152?v=4" width="100;" alt="Nevia Sebastian"/>
            <br />
            <sub><b>Nevia Sebastian</b></sub>
        </a>
    </td>
       <td align="center">
        <a href="https://github.com/Nk0x1">
            <img src="https://avatars.githubusercontent.com/u/114907090?v=4" width="100;" alt="Nikita Nair"/>
            <br />
            <sub><b>Nikita Nair</b></sub>
        </a>
    </td>
   </tr>
</table>

## License
This project is licensed under the [MIT License](LICENSE).
