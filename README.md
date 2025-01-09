
# DASH - Distributed Adaptive Serverless Hosting

## What is DASH?
DASH is a **peer-to-peer distributed system** for executing serverless functions and deploying tasks efficiently. It leverages **Tauri + Nextjs** to create a robust platform where clients can submit code, schedule tasks, and execute them seamlessly across a network of connected nodes.
DASH redefines task scheduling and execution by introducing an AI-powered [**DASH Scheduler**](https://github.com/Chackoz/Dash-Scheduler) , which dynamically assigns tasks based on node availability and resource utilization.

## Key Features
- **Peer-to-Peer Execution**: Facilitates distributed execution of serverless functions across multiple nodes.
- **AI-Based Task Scheduling**: DASH Scheduler intelligently allocates tasks for optimal performance and efficiency.
- **Real-Time Task Management**: Uses Firebase for instant updates and communication.
- **Scalable and Flexible**: Easily scales with the addition of new nodes.
- **Secure Execution**: Ensures the security and integrity of code and results throughout the pipeline.

---



## Screenshots

![image](https://github.com/user-attachments/assets/1c0f25e2-1441-4011-8639-96c70539330f)

![image](https://github.com/user-attachments/assets/8f5e334e-5885-4fa2-b9fd-a5541ecc98ae)

![image](https://github.com/user-attachments/assets/030337eb-99b5-4c32-aa98-2c009affebd6)


## How It Works

```markdown
1. # Clients Submit Code/Docker Image: 
   - Updated in database with metadata and marked as 'pending.'
   
2. # DASH Scheduler: 
   - The Scheduler listens for pending tasks, evaluates resource availability, and assigns tasks to the most suitable nodes.

3. # Task Execution:
   - Idle clients receive task assignments, execute the code, and report the results.

4. # Result Reporting:
   - Execution results are fetched and instantly updated for the original client.

5. # Client Notifications:
   - The system notifies clients with detailed results and execution logs.
```
---


## Technical Details

### Frontend
- **Framework**: Tauri + Next.js
- **Styling**: Tailwind CSS
- **Tauri API**: Used for secure desktop interactions.

### Backend
- **Database**: Firebase Realtime Database and Firestore. (for the prototype)
- **Deployment**: Scheduler is deployed in DASH itself

### Task Scheduler
- **Language**: Python
- **Libraries**: Firebase Admin SDK
- **Task Distribution**: Custom algorithm for dynamic task allocation.


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
