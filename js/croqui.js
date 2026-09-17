function baixarImagem() {
	html2canvas(document.querySelector("#croqui")).then((canvas) => {
		let link = document.createElement("a");
		link.download = "croqui.png";
		link.href = canvas.toDataURL();
		link.click();
	});
}
