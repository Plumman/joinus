using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace Fleet.Api.Controllers
{
  [ApiController]
   [Route("api")]

   public class UploadDownloadController: ControllerBase
   {
       private IWebHostEnvironment _hostingEnvironment;
  
       public UploadDownloadController(IWebHostEnvironment environment) {
           _hostingEnvironment = environment;
       }
  

  [Route("upload")]
       [HttpPost]
       
       public async Task<IActionResult> Upload(IFormFile file)
       {
           var uploads = Path.Combine(_hostingEnvironment.WebRootPath, "uploads");
           if(!Directory.Exists(uploads))
           {
               Directory.CreateDirectory(uploads);
           }
           if (file.Length > 0) {
               var filePath = Path.Combine(uploads, file.FileName);
               using (var fileStream = new FileStream(filePath, FileMode.Create)) {
                   await file.CopyToAsync(fileStream);
               }
           }
           return Ok();
       }
  

  [Route("files")]
       [HttpGet]
       
       public IActionResult Files() {
           var result =  new List<string>();
  
           var uploads = Path.Combine(_hostingEnvironment.WebRootPath, "uploads");
           if(Directory.Exists(uploads))
           {  
               var provider = _hostingEnvironment.ContentRootFileProvider;
               foreach (string fileName in Directory.GetFiles(uploads))
               {
                   var fileInfo = provider.GetFileInfo(fileName);
                   result.Add(fileInfo.Name);
               }
           }
           return Ok(result);
       } 
  
  
       private string GetContentType(string path)
       {
           var provider = new FileExtensionContentTypeProvider();
           string contentType;
           if(!provider.TryGetContentType(path, out contentType))
           {
               contentType = "application/octet-stream";
           }
           return contentType;
       }
   }
}
