const apiKey = 'AIzaSyCsDZTKiR-ecu5372rmxTppKCgaqDTTQvM'; // Replace with your API key
const maxResults = 100;

async function getComments(videoId, hashtag) {
    const spinner = document.querySelector('.progress'); 
    spinner.style.display = 'block'; 
    let comments = [];
    let nextPageToken = '';

    try {
        do {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?key=${apiKey}&textFormat=plainText&part=snippet&videoId=${videoId}&maxResults=${maxResults}&pageToken=${nextPageToken}`);
            const data = await response.json();

            if (data.items) {
                for (const item of data.items) {
                    const comment = item.snippet.topLevelComment.snippet;
                    const commentData = {
                        username: comment.authorDisplayName,
                        comment: comment.textDisplay,
                        likeCount: comment.likeCount,
                        publishedAt: comment.publishedAt,
                        replies: [] // Prepare to store replies
                    };

                    // Fetch replies for this comment
                    const replies = await getReplies(item.id);
                    commentData.replies = replies;

                    // Check if the comment contains the specified hashtag
                    if (commentData.comment.includes(hashtag)) {
                        comments.push(commentData);
                    }
                }
            }

            nextPageToken = data.nextPageToken;
        } while (nextPageToken);
    } catch (error) {
        console.log("Error Fetching Comments", error);
    } finally {
        spinner.style.display = 'none'; 
    }

    return comments;
}

async function getReplies(commentId) {
    let replies = [];
    let nextPageToken = '';

    do {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/comments?key=${apiKey}&textFormat=plainText&part=snippet&parentId=${commentId}&maxResults=${maxResults}&pageToken=${nextPageToken}`);
        const data = await response.json();

        if (data.items) {
            data.items.forEach(item => {
                const reply = item.snippet;
                replies.push({
                    username: reply.authorDisplayName,
                    comment: reply.textDisplay,
                    likeCount: reply.likeCount,
                    publishedAt: reply.publishedAt
                });
            });
        }

        nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return replies;
}

function displayComments(comments) {
    const container = document.getElementById('comments-container');
    container.innerHTML = ''; // Clear previous comments

    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment');
        commentDiv.innerHTML = `
            <strong>${comment.username}</strong>
            <p>${comment.comment}</p>
            <small>Likes: ${comment.likeCount} | Published at: ${new Date(comment.publishedAt).toLocaleString()}</small>
            <div class="replies">
                ${comment.replies.map(reply => `
                    <div class="reply">
                        <strong>${reply.username}</strong>
                        <p>${reply.comment}</p>
                        <small>Likes: ${reply.likeCount} | Published at: ${new Date(reply.publishedAt).toLocaleString()}</small>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(commentDiv);
    });
    document.querySelector('#commFetch').value = '';
    document.querySelector('.features').innerHTML='';
}

document.getElementById('comment-form').addEventListener('submit', function(event) {
    event.preventDefault(); 

    const videoId = document.querySelector('#commFetch').value; // Get the video ID from the input
    const hashtag = document.querySelector('#hashtagInput').value; // Get the hashtag from the input

    getComments(videoId, hashtag)
        .then(comments => {
            displayComments(comments);
            // Uncomment the line below if you want to export comments to Excel
            // exportToExcel(comments); 
        })
        .catch(error => {
            console.error('Error fetching comments:', error);
        });
});

// Optional: Function to export comments to Excel
function exportToExcel(comments) {
    const worksheet = XLSX.utils.json_to_sheet(comments.map(comment => ({
        username: comment.username,
        comment: comment.comment,
        likeCount: comment.likeCount,
        publishedAt: comment.publishedAt,
        replies: comment.replies.map(reply => `${reply.username}: ${reply.comment}`).join(' | ')
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comments");
    XLSX.writeFile(workbook, "YouTube_Comments.xlsx");
}
