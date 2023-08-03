
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
  import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged  } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
  import { getFirestore,  doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs,  addDoc, serverTimestamp, onSnapshot, orderBy, increment } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
  import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js";


  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);


//  ===================== register user with firebase ===========================================
  let registerBtn = document.getElementById("register-btn");

  registerBtn && registerBtn.addEventListener("click", (e) => {
    e.preventDefault()
    let fullName = document.getElementById("fullName")
    let email = document.getElementById("email")
    let password = document.getElementById("password")
    createUserWithEmailAndPassword(auth, email.value, password.value)
        .then(async (userCredential) => {
            try {
                const user = userCredential.user;
                await setDoc(doc(db, "users", user.uid), {
                    fullName: fullName.value,
                    email: email.value,
                    password: password.value
                });
                Swal.fire({
                    icon: 'success',
                    title: 'User register successfully',
                })
                localStorage.setItem("uid", user.uid)
                location.href = "logIn.html"
            } catch (err) {
                console.log(err)
            }
        })
        .catch((error) => {
            const errorMessage = error.message;
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: errorMessage,
            })
        });
})


// ====================login user with firebase=====================================

let loginBtn = document.getElementById("login-btn");

loginBtn && loginBtn.addEventListener("click", (e) => {
e.preventDefault()
let email = document.getElementById("email");
let password = document.getElementById("password");
signInWithEmailAndPassword(auth, email.value, password.value)
  .then((userCredential) => {
      try {
      // Signed in 

    const user = userCredential.user;
    Swal.fire({
        icon: 'success',
        title: 'User login successfully',
    })
    localStorage.setItem("uid", user.uid)
    location.href = "profile.html"
      }catch(error){
        console.log(error, "error message")

      }
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: errorMessage,
    })
  });

} )


//==================== upload a file. in this project we are uploading profile image ========================


const uploadFile = (file) => {
    return new Promise((resolve, reject) => {
        const mountainsRef = ref(storage, `images/${file.name}`);
        const uploadTask = uploadBytesResumable(mountainsRef, file);
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
                switch (snapshot.state) {
                    case 'paused':
                        console.log('Upload is paused');
                        break;
                    case 'running':
                        console.log('Upload is running');
                        break;
                }
            },
            (error) => {
                reject(error)
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    resolve(downloadURL);
                });
            }
        );
    })
}



//  ========================= logout user from firebase and localStorage ===========================

let logoutBtn = document.getElementById("logout-btn");

logoutBtn && logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
        localStorage.clear()
        location.href = "logIn.html"
        // Sign-out successful.
      }).catch((error) => {
        console.log(error, "error message");
      });
})

let userProfile = document.getElementById("user-profile");

// get user data from firebase
const getUserData = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        let fullName = document.getElementById("fullName");
        let email = document.getElementById("email");
        console.log("Document data:", docSnap.data());
        if(location.pathname === "/profile.html"){

            fullName.value = docSnap.data().fullName;
            email.value = docSnap.data().email;
            
            if(docSnap.data().picture){
                userProfile.src = docSnap.data().picture
            }
        
        }
        else{
            fullName.innerHTML = docSnap.data().fullName;
            email.innerHTML = docSnap.data().email;
            
            if(docSnap.data().picture){
                userProfile.src = docSnap.data().picture
            }
        }
     }else {
        // docSnap.data() will be undefined in this case
        console.log("No such document!");
    }
}



onAuthStateChanged(auth, (user) => {
    const uid = localStorage.getItem("uid")
    if (user && uid) {
        console.log(user)
        getUserData(user.uid);
        getAllUser(user.email);
        if (location.pathname !== '/profile.html' && location.pathname !== '/chat.html') {
            location.href = "profile.html"
        } 
    }
    else {
        if (location.pathname !== '/logIn.html' && location.pathname !== "/register.html") {
            location.href = "logIn.html"
        }
    }
});



const fileInput = document.getElementById("file-input");

fileInput && fileInput.addEventListener("change", () => {
    console.log(fileInput.files[0])
    userProfile.src = URL.createObjectURL(fileInput.files[0])
})



const updateProfile = document.getElementById("update-profile");

updateProfile && updateProfile.addEventListener("click", async () => {
    let uid = localStorage.getItem("uid")
    let fullName = document.getElementById("fullName")
    let email = document.getElementById("email")
    const imageUrl = await uploadFile(fileInput.files[0])
    const washingtonRef = doc(db, "users", uid);
    await updateDoc(washingtonRef, {
        fullName: fullName.value,
        email: email.value,
        picture: imageUrl
    });
    Swal.fire({
        icon: 'success',
        title: 'User updated successfully',
    })
})



const getAllUser = async (email) => {
    console.log("email", email)
    const q = query(collection(db, "users"), orderBy("email"), where("email", "!=", email), orderBy("isActive", 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ ...doc.data(), uid: doc.id });
        });
        const chatList = document.getElementById("chat-list")
        chatList.innerHTML = ""
        for (var i = 0; i < users.length; i++) {
            const { email, fullName, picture, isActive, notifications, uid } = users[i]
            chatList.innerHTML += `
                      <li onclick="selectChat('${email}','${fullName}','${picture}','${uid}')" class="user-container list-group-item d-flex justify-content-between align-items-start">
                         <div class="ms-2 me-auto">
                             <div class="fw-bold">${fullName} </div>
                             <span class="user-email">${email}</span>
                         </div>
                         ${notifications ?  `<span class="badge rounded-pill bg-danger notification-badge">
                         ${notifications}
                       </span>` : ""}
                         <div class="online-dot ${isActive ? 'green-dot' : 'red-dot'}"></div>
                     </li>`
        }
    })
}

let selectedUserId ;


const selectChat = (email, fullName, picture, selectedId) => {

    
    selectedUserId = selectedId;
    console.log("selectedUserId", selectedUserId)
    let chatId;

    let currentUserId = localStorage.getItem("uid");

    if(currentUserId > selectedUserId){
        chatId = currentUserId + selectedUserId;
    }
    else{
        chatId = selectedUserId + currentUserId;
    }
    let selectedFullName = document.getElementById("selected-fullName");
    let selectedEmail = document.getElementById("selected-email");
    let selectedUserProfile = document.getElementById("selected-user-profile");

    selectedFullName.innerHTML = fullName;
    selectedEmail.innerHTML = email;
    

    if(picture !== "undefined"){
        selectedUserProfile.src = picture;
    }else{
        selectedUserProfile.src = "/images/user.png";
    }
    console.log("chat id in select chat", chatId )

    let chatContainer = document.getElementById("chatContainer");
    chatContainer.style.display = "block";

    getAllMessages(chatId);
    

}

window.selectChat = selectChat;


let messageInput = document.getElementById("message-input");

messageInput && messageInput.addEventListener("keydown", async (e) => {
    let currentUserId = localStorage.getItem("uid");
    
    let chatId;
    
    if(e.keyCode === 13){
        
        if(currentUserId > selectedUserId){
            chatId = currentUserId + selectedUserId;
        
        
        }else{
            chatId = selectedUserId + currentUserId;
        console.log("chat id in input down", chatId)

        }
        // console.log("chat id in input down", chatId)

        const docRef = await addDoc(collection(db, "messages"), {
            message : messageInput.value,
            chatId : chatId,
            timestamp : serverTimestamp(),
            senderId : currentUserId,
            recieverId :  selectedUserId
              
          });
          const userRef = doc(db, "users", selectedUserId);
           await updateDoc(userRef, {
        notifications : increment(1)
    });
          messageInput.value = "";
          console.log("message sent");


    }  
    
})


// get all messages with realtime firebase
function getAllMessages(chatId) {

    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), where("chatId", "==", chatId));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
    let chatBox = document.getElementById("chat-box");
    let currentUserId = localStorage.getItem("uid");

        let messages = [];
        querySnapshot.forEach((doc) => {
            messages.push(doc.data());
        });
        console.log("messages", messages);
    
         chatBox.innerHTML = "";

        for(var i = 0; i < messages.length; i++){
            let time = messages[i].timestamp ? moment(messages[i].timestamp.toDate()).fromNow() : moment().fromNow()
            if(currentUserId === messages[i].senderId){
           chatBox.innerHTML += `
                            <div class="message-box left-message mb-2">
                                ${messages[i].message}
                                <br>
                                <span>${time} </span>
                            </div>
                            `}
            else {
                chatBox.innerHTML +=
                            `<div class="message-box right-message mb-2">
                            ${messages[i].message}
                            <br>
                            
                                <span>${time} </span>
                             </div>`
                             }                
        }
    });
}


let setActiveStatus = async () => {

    let currentUserId = localStorage.getItem("uid");
    const userRef = doc(db, "users", currentUserId);
    await updateDoc(userRef, {
        isActive : status
    });

}

window.addEventListener("beforeunload", ()=> {
    setActiveStatus(false)
});


window.addEventListener("focus", ()=> {
    setActiveStatus(true)
});

// merged chatId = RzX5Dx69ZzaWYoo79btJf8sJ9Yj2u9I7pfYpxZYm46vMdB9OHujKErt1
             //    RzX5Dx69ZzaWYoo79btJf8sJ9Yj2fQmSNbMLCCcCLDt9ZMDrIw8UQLx2



