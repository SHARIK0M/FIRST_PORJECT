const showError=async(req,res)=>{
    try{
        res.render("user/error")
    }
    catch(error){
        console.log(error)
    }
}

module.exports={
    showError
}