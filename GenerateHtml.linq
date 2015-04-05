<Query Kind="Program">
  <Reference Relative="LowProfile.Core.dll">C:\Users\Valdemar\Desktop\Exercises\LowProfile.Core.dll</Reference>
  <NuGetReference>MarkdownSharp</NuGetReference>
  <NuGetReference>Newtonsoft.Json</NuGetReference>
</Query>

class Lesson
{
	public string Name { get; set; } 
	public string Notes { get; set; } 
	public string Image { get; set; } 
	public string[] Variations { get; set; } 
}

class Chapter
{
	public string Title { get; set; }
	public string Notes { get; set; }
	public Lesson[] Lessons { get; set; }
}

bool IsOlder(string file, string comparedTofile)
{
	var a = new FileInfo(file);
	var b = new FileInfo(comparedTofile);
	return a.LastWriteTimeUtc < b.LastWriteTimeUtc;
}

void CheckPdfs(string dir)
{
	var issues = new List<string>();
	
	var gpFiles = Directory.GetFiles(dir, "*.gpx");
	foreach (var file in gpFiles)
	{
		var pdf = file.Replace(".gpx", ".pdf");
		if (!File.Exists(pdf))
		{
			issues.Add("Missing pdf file: " + pdf);
			continue;
		}
		
		if (IsOlder(pdf, file))
			issues.Add("Pdf file is out of date: " + pdf);
	}
	
	if (issues.Any())
	{
		issues.Dump();
		throw new Exception();
	}
}

void ConvertPdfs(string dir)
{
	var files = Directory.GetFiles(dir, "*.pdf");
	
	System.Threading.Tasks.Parallel.ForEach(files, file =>
	//foreach (var file in files)
	{
		var input = file;
		var outputFile = Path.GetFileNameWithoutExtension(file) + ".temp.png";
		var output = Path.Combine(dir, outputFile);
		var finalOutput = output.Replace(".temp.png", ".png");
		if (!File.Exists(finalOutput) || IsOlder(finalOutput, input))
		{
			Console.WriteLine("Regenerating png file for {0}", input); 
			var cmd = String.Format("convert -density 300 -depth 8 \"{0}\" \"{1}\"", input, output);
			LowProfile.Core.Utils.ProcessHelper.Run(cmd, true);
			CropPng(output, finalOutput);
			File.Delete(output);
		}
	});
}

void CropPng(string input, string output)
{
	using (var sourceImg = new System.Drawing.Bitmap(input))
	{
		var width = sourceImg.Width;
		var desiredHeight = sourceImg.Height;
		var cropTop = 250;
		
		while(true)
		{
			var line = Enumerable.Range(0, width).Select(x => sourceImg.GetPixel(x, desiredHeight - 1)).ToArray();
			var hasData = line.Any(p => p.B != 255);
			if (hasData)
				break;
			else
				desiredHeight--;
		}
		
		desiredHeight = desiredHeight - cropTop;
		
		using (var img2 = new System.Drawing.Bitmap(width, desiredHeight))
		using (var ctx = System.Drawing.Graphics.FromImage(sourceImg))
		using (var ctx2 = System.Drawing.Graphics.FromImage(img2))
		{	
			var sourceRect = new System.Drawing.RectangleF(0f, cropTop, width, desiredHeight);
			var destRect = new System.Drawing.RectangleF(0f, 0f, width, desiredHeight);
			ctx2.DrawImage(sourceImg, destRect, sourceRect, System.Drawing.GraphicsUnit.Pixel);
			img2.Save(output, System.Drawing.Imaging.ImageFormat.Png);
		}
	}
}

string CreateChapterInfo(Chapter chapter)
{
	var sb = new StringBuilder();
	sb.AppendLine("<div class=\"chapter\">");
	
	sb.AppendLine("    <h1>" + chapter.Title + "</h1>");
	sb.AppendLine("    <p>" + chapter.Notes + "</p>");
	sb.AppendLine("        <ul>");
	foreach (var lesson in chapter.Lessons)
		sb.AppendLine("        <li>" + lesson.Name + "</li>");
	sb.AppendLine("        </ul>");
	sb.AppendLine("</div>");
	return sb.ToString();
}

Dictionary<string, string> CreateLessonHtmlParts(string dir, Chapter chapter)
{
	var output = new Dictionary<string, string>();
	Console.WriteLine("Creating Html templates for {0} lessons", chapter.Lessons.Length);
	foreach (var lesson in chapter.Lessons)
	{
		var png = Path.Combine(dir, lesson.Image);
		var header = lesson.Name;
		
		var sb = new StringBuilder();
		sb.AppendLine("<div class=\"lesson\">");
		
		sb.AppendLine("    <div class=\"lessonInfo\">");
		sb.AppendLine("        <h2>" + lesson.Name + "</h2>");
		sb.AppendLine("        <div class=\"rightCol\">" + lesson.Notes + "</div>");
		sb.AppendLine("        <div class=\"leftCol\">");
		sb.AppendLine("            <ul>");
		foreach (var variation in lesson.Variations)
			sb.AppendLine("            <li>" + variation + "</li>");
		sb.AppendLine("            </ul>");
		sb.AppendLine("        </div>");
		sb.AppendLine("    </div>");
		
		sb.AppendLine("    <div class=\"imgDiv\">");
		sb.AppendLine(string.Format("        <img class=\"lessonImg\" src=\"{0}\">", png));
		sb.AppendLine("    </div>");
		
		sb.AppendLine("</div>");
		
		output[header] = sb.ToString();
	}
	
	return output;
}

string GenerateChapterFile(string title, string chapterInfo, Dictionary<string, string> lessons)
{
	var sb = new StringBuilder();
	sb.AppendLine("<html>");
	sb.AppendLine("<head>");
	sb.AppendLine("<title>" + title + "</title>");
	sb.AppendLine("<link rel=\"stylesheet\" type=\"text/css\" href=\"../style.css\">");
	sb.AppendLine("</head>");
	sb.AppendLine("<body>");
	
	sb.AppendLine(chapterInfo);
	
	foreach (var lesson in lessons)
	{
		sb.AppendLine(lesson.Value);
	}
	sb.AppendLine("</body>");
	sb.AppendLine("</html>");
	return sb.ToString();
}


void Main()
{
	var baseDir = Path.GetDirectoryName(Util.CurrentQueryPath);
	var chapters = new[] { "Dexterity", "Scales" };
	
	foreach (var chapterName in chapters)
	{
		var dir = Path.Combine(baseDir, chapterName);
		var jsonData = File.ReadAllText(Path.Combine(dir, "Chapter.json"));
		var chapter = Newtonsoft.Json.JsonConvert.DeserializeObject<Chapter>(jsonData);
		CheckPdfs(dir);
		ConvertPdfs(dir);
		var chapterInfo = CreateChapterInfo(chapter);
		var lessonParts = CreateLessonHtmlParts(dir, chapter);
		var htmlFile = GenerateChapterFile(chapter.Title, chapterInfo, lessonParts);
		File.WriteAllText(Path.Combine(dir, "Chapter.html"), htmlFile);
	}
}