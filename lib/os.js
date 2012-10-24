

exports.isSudo = function() {
	if (
		typeof process.env.SUDO_USER === "string" ||
	    typeof process.env.SUDO_UID === "string" ||
	    typeof process.env.SUDO_GID === "string"
	) {
		return true;
	}
	return false;
}

