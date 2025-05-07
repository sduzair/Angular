# Users Reporting with Material Table

A simple app for fetching, storing, and reporting user data using a Material Table UI.

## Data Source Processing

- **API Endpoint:** [https://dummyjson.com/users?limit=0](https://dummyjson.com/users?limit=0)
- For each user, nested fields (`company`, `address`, `bank`, `crypto`) are wrapped in arrays
- Transformed user data is stored as [`usersData.json`](./usersData.json)

```javascript
res.users.forEach(user => {
    Object.keys(user).filter(key => ['company', 'address', 'bank', 'crypto'].includes(key)).forEach(key => {
        if (!user[key])
            return
        user[key] = [user[key]]
    })
})
```

## Database Schema and Intitialization

| Entity               | Suggested Name  |
|----------------------|----------------|
| **Database**         | `userAppDB`    |
| **Users Collection** | `users`        |
| **Sessions Collection** | `sessions`   |

- **Docker Image**
  - Copies [`usersData.json`](./usersData.json) and [`init.sh`](./init.sh) during image build
  - `mongoimport` loads users data into `userAppDB` database in `users` collection
  - Creates emtpy `session` collection

- **Container Deployment (local)**:
  - Build command: `docker build -t userapp-mongo .`
  - Run command: `docker run -d --name mongodb -p 27017:27017 userapp-mongo`
  - Verify run:
    - `docker exec -it mongodb mongosh userAppDB`
    - `show collections`
    - `db.users.find()`
    - `db.sessions.stats()`

## License

MIT
