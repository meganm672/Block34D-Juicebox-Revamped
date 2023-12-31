const express = require('express');
const postsRouter = express.Router();
const prisma = require("../../../client")
const { requireUser } = require('./utils');


postsRouter.get('/', async (req, res, next) => {

    try {
      const posts = await prisma.posts.findMany({
        include: {tags: true}
      });
      //only active posts or all post by user... filter
      const userPosts= posts.filter(post =>{
         // the post is active, doesn't matter who it belongs to
      if (post.active) {
        return true;
      }

      // the post is not active, but it belogs to the current user
      if (req.user && post.authorId === req.user.id) {
        return true;
      }

      // none of the above are true
      return false;
    });
      res.send({
        posts
      });
    } catch ({ name, message }) {
      next({ name, message });
    }
  });

  postsRouter.get('/:id', async (req,res,next) =>{
    try{
        const postById = await prisma.posts.findUnique({
            where:{
                id: Number(req.params.id)
            },
            include: {tags:true}
        });
        res.send({post: postById})
    }catch({ name, message }){
        next({ name, message });
    }
  })
  
  postsRouter.post('/', requireUser, async (req, res, next) => {
    const { title, content = "", tags } = req.body;
  
    const postData = {};
  
    try {
      postData.authorId = req.user.id;
      postData.title = title;
      postData.content = content;
      postData.tags = tags;
  
      const post = await prisma.posts.create({
        data:{
            authorId: req.user.id,
            title: title,
            content: content,
            tags:{
                create: tags
            }
        },
        include: {tags: true}
    });

      if (post) {
        res.send(post);
      } else {
        next({
          name: 'PostCreationError',
          message: 'There was an error creating your post. Please try again.'
        })
      }
    } catch ({ name, message }) {
      next({ name, message });
    }
  });


postsRouter.put('/:postId', requireUser, async (req, res, next) => {
    const { postId } = req.params;
    const { title, content, tags } = req.body;

    try {
        const originalPost = await prisma.posts.findUnique({
            where:{
                id: Number(postId)
            }
        })
   
      if (originalPost.authorId === req.user.id) {

        const updatedPost =  await prisma.posts.update({
                where:{
                   id: Number(postId),
                   authorId: Number(req.user.id)
                },
                data:{
                    title: title,
                    content: content,
                    tags:{
                        updateMany:{
                            where:{
                                id: tags.id
                            },
                            data:{name: tags.name}
                        }
                    }
                },
                include: {tags: true}
              });
        res.send({ post: updatedPost })
      } else {
        next({
          name: 'UnauthorizedUserError',
          message: 'You cannot update a post that is not yours'
        })
      }

    } catch ({ name, message }) {
      next({ name, message })
    }
  });


postsRouter.delete('/:postId', requireUser, async (req, res, next) => {
    try {
      const { postId } = req.params;
      const postToUpdate = await prisma.posts.findUnique({
        where:{
            id: Number(postId),
        }
    })

      if (!postToUpdate) {
        res.status(404)
        next({
          name: "NotFound",
          message: `No post by ID ${postId}`
        }) 
      } else if (req.user.id !== postToUpdate.authorId) {
        res.status(403);
        next({
          name: "WrongUserError",
          message: "You must be the same user who created this post to perform this action"
        });
      } else {
        const deletedPost = await prisma.posts.delete({
            where:{
                id: Number(postId),
                authorId: Number(req.user.id)
            }
          })
        res.send({ success: true, ...deletedPost });
      }
    } catch ({ name, message }) {
      next({ name, message });
    }
  });
  

module.exports = postsRouter;